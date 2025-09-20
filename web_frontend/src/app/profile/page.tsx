"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { updateProfile, removeProfileAvatar, checkUsernameAvailable } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    phone: "",
    addressStreet: "",
    addressCity: "",
    addressState: "",
    addressPincode: "",
    addressLandmark: "",
    dietaryPreference: "none" as
      | "none"
      | "vegan"
      | "vegetarian"
      | "eggetarian"
      | "non-vegetarian",
    hideNonVeg: false,
    religion: "" as
      | ""
      | "hindu"
      | "muslim"
      | "christian"
      | "jain"
      | "buddhist"
      | "sikh"
      | "other"
      | "prefer_not_to_say",
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Check username availability with debounce
  useEffect(() => {
    if (!formData.username || formData.username === user?.username) {
      setUsernameStatus("idle");
      setUsernameError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus("checking");
      setUsernameError(null);

      try {
        const result = await checkUsernameAvailable(formData.username, user?.id);
        if (result.success && result.data) {
          if (result.data.available) {
            setUsernameStatus("available");
            setUsernameError(null);
          } else {
            setUsernameStatus("taken");
            setUsernameError("This username is already taken");
          }
        }
      } catch {
        setUsernameStatus("idle");
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [formData.username, user?.username, user?.id]);

  // Load user data into form
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        username: user.username || "",
        phone: user.phone || "",
        addressStreet: user.addressStreet || "",
        addressCity: user.addressCity || "",
        addressState: user.addressState || "",
        addressPincode: user.addressPincode || "",
        addressLandmark: user.addressLandmark || "",
        dietaryPreference:
          (user.dietaryPreference as typeof formData.dietaryPreference) ||
          "none",
        hideNonVeg: user.hideNonVeg || false,
        religion: (user.religion as typeof formData.religion) || "",
      });
      if (user.avatarUrl) {
        setAvatarPreview(user.avatarUrl);
      }
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;

    try {
      const result = await removeProfileAvatar(user.id);
      if (result.success && result.data) {
        updateUser({ avatarUrl: null, avatarId: null });
        setAvatarPreview(null);
        setAvatar(null);
        setSuccess("Avatar removed successfully");
      } else {
        setError(result.error || "Failed to remove avatar");
      }
    } catch (err) {
      setError("Failed to remove avatar");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check if username is taken
    if (usernameStatus === "taken") {
      setError("Please choose a different username - this one is already taken");
      return;
    }

    // Wait for username check to complete
    if (usernameStatus === "checking") {
      setError("Please wait while we verify username availability");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const result = await updateProfile(user.id, {
        ...formData,
        avatar: avatar || undefined,
      });

      if (result.success && result.data) {
        updateUser(result.data);
        setSuccess("Profile updated successfully!");
        setAvatar(null);
      } else {
        setError(result.error || "Failed to update profile");
      }
    } catch (err) {
      setError("Failed to update profile");
    }

    setIsSubmitting(false);
  };

  const handlePasswordUpdate = async () => {
    if (!user) return;

    setPasswordError(null);
    setPasswordSuccess(null);

    // Validation
    if (!passwordData.newPassword) {
      setPasswordError("Please enter a new password");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const result = await updateProfile(user.id, {
        password: passwordData.newPassword,
      });

      if (result.success) {
        setPasswordSuccess(user.password ? "Password updated successfully!" : "Password set successfully!");
        setPasswordData({ newPassword: "", confirmPassword: "" });
        setShowPasswordSection(false);
        // Update user context to reflect password exists
        updateUser({ ...user, password: "set" });
      } else {
        setPasswordError(result.error || "Failed to update password");
      }
    } catch (err) {
      setPasswordError("Failed to update password");
    }

    setIsUpdatingPassword(false);
  };

  if (!user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-surface-container)" }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8"
      style={{ backgroundColor: "var(--color-surface-container)" }}
    >
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/orders"
            className="w-10 h-10 rounded-md flex items-center justify-center transition-all hover:opacity-80"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <span
              className="material-symbols-outlined"
              style={{ color: "var(--color-on-surface)" }}
            >
              arrow_back
            </span>
          </Link>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--color-on-surface)" }}
            >
              Edit Profile
            </h1>
            <p
              className="text-sm"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Update your account information
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Avatar Section */}
          <div
            className="rounded-2xl p-6 shadow-sm mb-6"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <h2
              className="font-semibold mb-4"
              style={{ color: "var(--color-on-surface)" }}
            >
              Profile Picture
            </h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div
                  className="w-24 h-24 rounded-full overflow-hidden"
                  style={{ backgroundColor: "var(--color-surface-container)" }}
                >
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt="Avatar"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span
                        className="material-symbols-outlined text-4xl"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        person
                      </span>
                    </div>
                  )}
                </div>
                <label
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all hover:opacity-80"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  <span
                    className="material-symbols-outlined text-sm"
                    style={{ color: "var(--color-on-primary)" }}
                  >
                    photo_camera
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex-1">
                <p
                  className="text-sm mb-2"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Upload a photo to personalize your account
                </p>
                {(avatarPreview || user.avatarUrl) && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-sm font-medium transition-all hover:opacity-80"
                    style={{ color: "var(--color-error)" }}
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div
            className="rounded-2xl p-6 shadow-sm mb-6"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <h2
              className="font-semibold mb-4"
              style={{ color: "var(--color-on-surface)" }}
            >
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-md border-2 focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: "var(--color-surface-container-low)",
                    borderColor: "var(--color-outline-variant)",
                    color: "var(--color-on-surface)",
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        username: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_]/g, ""),
                      })
                    }
                    placeholder="@username"
                    className="w-full px-4 py-3 pr-10 rounded-md border-2 focus:outline-none focus:ring-2 transition-all"
                    style={{
                      backgroundColor: "var(--color-surface-container-low)",
                      borderColor: usernameStatus === "taken"
                        ? "var(--color-error)"
                        : usernameStatus === "available"
                          ? "#22c55e"
                          : "var(--color-outline-variant)",
                      color: "var(--color-on-surface)",
                    }}
                  />
                  {/* Status indicator */}
                  {formData.username && formData.username !== user?.username && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameStatus === "checking" && (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-gray-600" />
                      )}
                      {usernameStatus === "available" && (
                        <span className="material-symbols-outlined text-green-500">check_circle</span>
                      )}
                      {usernameStatus === "taken" && (
                        <span className="material-symbols-outlined text-red-500">cancel</span>
                      )}
                    </div>
                  )}
                </div>
                {usernameStatus === "taken" ? (
                  <p className="text-xs mt-1 text-red-500 font-medium">
                    This username is already taken
                  </p>
                ) : usernameStatus === "available" ? (
                  <p className="text-xs mt-1 text-green-500 font-medium">
                    Username is available
                  </p>
                ) : (
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Only lowercase letters, numbers, and underscores
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-3 rounded-md border-2 opacity-50 cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--color-surface-container-low)",
                    borderColor: "var(--color-outline-variant)",
                    color: "var(--color-on-surface)",
                  }}
                />
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Email cannot be changed
                </p>
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 rounded-md border-2 focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: "var(--color-surface-container-low)",
                    borderColor: "var(--color-outline-variant)",
                    color: "var(--color-on-surface)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div
            className="rounded-2xl p-6 shadow-sm mb-6"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <h2
              className="font-semibold mb-4"
              style={{ color: "var(--color-on-surface)" }}
            >
              Delivery Address
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.addressStreet}
                  onChange={(e) =>
                    setFormData({ ...formData, addressStreet: e.target.value })
                  }
                  placeholder="123 Main Street, Apartment 4B"
                  className="w-full px-4 py-3 rounded-md border-2 focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: "var(--color-surface-container-low)",
                    borderColor: "var(--color-outline-variant)",
                    color: "var(--color-on-surface)",
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--color-on-surface)" }}
                  >
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.addressCity}
                    onChange={(e) =>
                      setFormData({ ...formData, addressCity: e.target.value })
                    }
                    placeholder="Mumbai"
                    className="w-full px-4 py-3 rounded-md border-2 focus:outline-none focus:ring-2 transition-all"
                    style={{
                      backgroundColor: "var(--color-surface-container-low)",
                      borderColor: "var(--color-outline-variant)",
                      color: "var(--color-on-surface)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--color-on-surface)" }}
                  >
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.addressState}
                    onChange={(e) =>
                      setFormData({ ...formData, addressState: e.target.value })
                    }
                    placeholder="Maharashtra"
                    className="w-full px-4 py-3 rounded-md border-2 focus:outline-none focus:ring-2 transition-all"
                    style={{
                      backgroundColor: "var(--color-surface-container-low)",
                      borderColor: "var(--color-outline-variant)",
                      color: "var(--color-on-surface)",
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--color-on-surface)" }}
                  >
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.addressPincode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        addressPincode: e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6),
                      })
                    }
                    placeholder="400001"
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-md border-2 focus:outline-none focus:ring-2 transition-all"
                    style={{
                      backgroundColor: "var(--color-surface-container-low)",
                      borderColor: "var(--color-outline-variant)",
                      color: "var(--color-on-surface)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--color-on-surface)" }}
                  >
                    Landmark
                  </label>
                  <input
                    type="text"
                    value={formData.addressLandmark}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        addressLandmark: e.target.value,
                      })
                    }
                    placeholder="Near Central Mall"
                    className="w-full px-4 py-3 rounded-md border-2 focus:outline-none focus:ring-2 transition-all"
                    style={{
                      backgroundColor: "var(--color-surface-container-low)",
                      borderColor: "var(--color-outline-variant)",
                      color: "var(--color-on-surface)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Food Preferences */}
          <div
            className="rounded-2xl p-6 shadow-sm mb-6"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <h2
              className="font-semibold mb-4"
              style={{ color: "var(--color-on-surface)" }}
            >
              Food Preferences
            </h2>
            <div className="space-y-5">
              {/* Dietary Preference */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  Dietary Preference
                </label>
                <select
                  value={formData.dietaryPreference}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dietaryPreference: e.target
                        .value as typeof formData.dietaryPreference,
                    })
                  }
                  className="w-full px-4 py-3 rounded-md border-2 focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundColor: "var(--color-surface-container-low)",
                    borderColor: "var(--color-outline-variant)",
                    color: "var(--color-on-surface)",
                  }}
                >
                  <option value="none">No preference</option>
                  <option value="vegan">Vegan</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="eggetarian">Eggetarian</option>
                  <option value="non-vegetarian">Non-vegetarian</option>
                </select>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  We&apos;ll prioritize showing items matching your preference
                </p>
              </div>
              {/* Religion/Cultural Preference */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  Religion / Cultural Preference
                </label>
                <select
                  value={formData.religion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      religion: e.target.value as typeof formData.religion,
                    })
                  }
                  className="w-full px-4 py-3 rounded-md border-2 focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundColor: "var(--color-surface-container-low)",
                    borderColor: "var(--color-outline-variant)",
                    color: "var(--color-on-surface)",
                  }}
                >
                  <option value="">Prefer not to say</option>
                  <option value="hindu">Hindu</option>
                  <option value="muslim">Muslim</option>
                  <option value="christian">Christian</option>
                  <option value="jain">Jain</option>
                  <option value="buddhist">Buddhist</option>
                  <option value="sikh">Sikh</option>
                  <option value="other">Other</option>
                </select>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  This helps us respect your food restrictions (e.g., no beef
                  for Hindus, halal for Muslims)
                </p>
              </div>
              {/* Hide Non-Veg Toggle */}
              <div
                className="flex items-center justify-between p-4 rounded-md cursor-pointer transition-all hover:shadow-sm active:scale-[0.99]"
                style={{
                  backgroundColor: formData.hideNonVeg
                    ? "rgba(34, 197, 94, 0.1)"
                    : "var(--color-surface-container-low)",
                  border: formData.hideNonVeg ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid transparent",
                }}
                onClick={() =>
                  setFormData({ ...formData, hideNonVeg: !formData.hideNonVeg })
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: formData.hideNonVeg
                        ? "rgba(34, 197, 94, 0.2)"
                        : "var(--color-surface-container)",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        color: formData.hideNonVeg
                          ? "#16a34a"
                          : "var(--color-on-surface-variant)",
                        fontSize: "20px",
                      }}
                    >
                      eco
                    </span>
                  </div>
                  <div className="flex-1">
                    <p
                      className="font-medium"
                      style={{ color: formData.hideNonVeg ? "#16a34a" : "var(--color-on-surface)" }}
                    >
                      Hide Non-Veg Items
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      Only show vegetarian and vegan items
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormData({
                      ...formData,
                      hideNonVeg: !formData.hideNonVeg,
                    });
                  }}
                  className="relative w-12 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-inner"
                  style={{
                    backgroundColor: formData.hideNonVeg
                      ? "#22c55e"
                      : "var(--color-outline-variant)",
                  }}
                  aria-label="Toggle hide non-veg items"
                >
                  <span
                    className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transform transition-all duration-300 flex items-center justify-center"
                    style={{
                      left: formData.hideNonVeg ? "calc(100% - 26px)" : "2px",
                    }}
                  >
                    {formData.hideNonVeg && (
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: "14px",
                          color: "#16a34a",
                        }}
                      >
                        check
                      </span>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Security / Password Section */}
          <div
            className="rounded-2xl p-6 shadow-sm mb-6"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2
                  className="font-semibold"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  Security
                </h2>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  {user.password ? "Update your password" : "Set a password to login without face scan"}
                </p>
              </div>
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center"
                style={{ backgroundColor: "var(--color-surface-container)" }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  lock
                </span>
              </div>
            </div>

            {!showPasswordSection ? (
              <button
                type="button"
                onClick={() => setShowPasswordSection(true)}
                className="w-full py-3 rounded-md font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{
                  backgroundColor: "var(--color-surface-container-low)",
                  color: "var(--color-primary)",
                  border: "1px solid var(--color-outline-variant)",
                }}
              >
                <span className="material-symbols-outlined text-xl">
                  {user.password ? "edit" : "add"}
                </span>
                {user.password ? "Change Password" : "Set Password"}
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--color-on-surface)" }}
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 rounded-md border-2 focus:outline-none focus:ring-2 transition-all"
                    style={{
                      backgroundColor: "var(--color-surface-container-low)",
                      borderColor: "var(--color-outline-variant)",
                      color: "var(--color-on-surface)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--color-on-surface)" }}
                  >
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    placeholder="Confirm new password"
                    className="w-full px-4 py-3 rounded-md border-2 focus:outline-none focus:ring-2 transition-all"
                    style={{
                      backgroundColor: "var(--color-surface-container-low)",
                      borderColor: "var(--color-outline-variant)",
                      color: "var(--color-on-surface)",
                    }}
                  />
                </div>

                {/* Password Error */}
                {passwordError && (
                  <div
                    className="p-3 rounded-md text-sm"
                    style={{
                      backgroundColor: "var(--color-error-container)",
                      color: "var(--color-on-error-container)",
                    }}
                  >
                    {passwordError}
                  </div>
                )}

                {/* Password Success */}
                {passwordSuccess && (
                  <div
                    className="p-3 rounded-md text-sm"
                    style={{
                      backgroundColor: "var(--color-tertiary-container)",
                      color: "var(--color-on-tertiary-container)",
                    }}
                  >
                    {passwordSuccess}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordSection(false);
                      setPasswordData({ newPassword: "", confirmPassword: "" });
                      setPasswordError(null);
                    }}
                    className="flex-1 py-3 rounded-md font-medium transition-all hover:opacity-90"
                    style={{
                      backgroundColor: "var(--color-surface-container-low)",
                      color: "var(--color-on-surface)",
                      border: "1px solid var(--color-outline-variant)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePasswordUpdate}
                    disabled={isUpdatingPassword}
                    className="flex-1 py-3 rounded-md font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--color-primary)",
                      color: "#ffffff",
                    }}
                  >
                    {isUpdatingPassword ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">save</span>
                        {user.password ? "Update Password" : "Set Password"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Loyalty Points */}
          <div
            className="rounded-2xl p-6 shadow-sm mb-6"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className="font-semibold"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  Loyalty Points
                </h2>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Earn points with every order
                </p>
              </div>
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-md"
                style={{ backgroundColor: "var(--color-primary-container)" }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: "var(--color-primary)" }}
                >
                  stars
                </span>
                <span
                  className="text-xl font-bold"
                  style={{ color: "var(--color-primary)" }}
                >
                  {user.totalPoints}
                </span>
                <span
                  className="text-sm"
                  style={{ color: "var(--color-on-primary-container)" }}
                >
                  pts
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div
              className="mb-6 p-4 rounded-md"
              style={{
                backgroundColor: "var(--color-error-container)",
                color: "var(--color-on-error-container)",
              }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              className="mb-6 p-4 rounded-md"
              style={{
                backgroundColor: "var(--color-tertiary-container)",
                color: "var(--color-on-tertiary-container)",
              }}
            >
              {success}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-md font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "#ffffff",
            }}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                Save Changes
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
