"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEmployee } from "@/context/EmployeeContext";
import { recognizeFace, searchCustomers } from "@/lib/employee-api";
import { registerFace } from "@/lib/api";
import { FaceRecognitionMatch } from "@/types";

// Dynamically import OrderKanban to avoid SSR issues with dnd-kit
const OrderKanban = dynamic(
  () => import("@/components/employee/OrderKanban"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    ),
  }
);

type DashboardTab = "customer-scanning" | "register-face" | "order-management";

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const { employee, isAuthenticated, isLoading, logout } = useEmployee();

  // Tab state
  const [activeTab, setActiveTab] = useState<DashboardTab>("customer-scanning");

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matches, setMatches] = useState<FaceRecognitionMatch[]>([]);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Register face state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const registerVideoRef = useRef<HTMLVideoElement>(null);
  const registerCanvasRef = useRef<HTMLCanvasElement>(null);
  const registerStreamRef = useRef<MediaStream | null>(null);
  const [isRegisterCameraActive, setIsRegisterCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/employee");
    }
  }, [isAuthenticated, isLoading, router]);

  // Cleanup cameras on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (registerStreamRef.current) {
        registerStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });

      streamRef.current = stream;
      // Set camera active first so the video element renders
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please check permissions.");
    }
  };

  // Effect to attach stream to video element once it's rendered
  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.log("Auto-play prevented:", err);
      });
    }
  }, [isCameraActive]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setError(null);

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.9);
      });

      if (!blob) {
        setError("Failed to capture image");
        setIsProcessing(false);
        return;
      }

      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

      // Call recognition API
      const result = await recognizeFace(file);

      if (result.success && result.data) {
        const recognizedMatches = result.data.matches || [];

        if (recognizedMatches.length === 0) {
          setError("No faces recognized. Try searching manually.");
        } else if (
          recognizedMatches.length === 1 &&
          recognizedMatches[0].similarity > 0.8
        ) {
          // High confidence single match - go directly
          router.push(
            `/employee/dashboard/customer/${recognizedMatches[0].profileId}`
          );
        } else {
          // Multiple matches or low confidence - show selection
          setMatches(recognizedMatches.slice(0, 3));
          setShowMatchModal(true);
        }
      } else {
        setError(result.error || "Recognition failed");
      }
    } catch (err) {
      console.error("Recognition error:", err);
      setError("Recognition failed. Please try again.");
    }

    setIsProcessing(false);
  };

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchCustomers(query);
      if (result.success && result.data) {
        setSearchResults(result.data);
      }
    } catch (err) {
      console.error("Search error:", err);
    }
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const selectCustomer = (profileId: string) => {
    setShowMatchModal(false);
    stopCamera();
    router.push(`/employee/dashboard/customer/${profileId}`);
  };

  // Register camera functions
  const startRegisterCamera = async () => {
    try {
      setRegisterError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      registerStreamRef.current = stream;
      setIsRegisterCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);
      setRegisterError("Unable to access camera. Please check permissions.");
    }
  };

  // Effect to attach register stream to video element
  useEffect(() => {
    if (isRegisterCameraActive && registerStreamRef.current && registerVideoRef.current) {
      registerVideoRef.current.srcObject = registerStreamRef.current;
      registerVideoRef.current.play().catch((err) => {
        console.log("Auto-play prevented:", err);
      });
    }
  }, [isRegisterCameraActive]);

  const stopRegisterCamera = () => {
    if (registerStreamRef.current) {
      registerStreamRef.current.getTracks().forEach((track) => track.stop());
      registerStreamRef.current = null;
    }
    if (registerVideoRef.current) {
      registerVideoRef.current.srcObject = null;
    }
    setIsRegisterCameraActive(false);
  };

  const captureRegisterImage = () => {
    if (!registerVideoRef.current || !registerCanvasRef.current) return;

    const canvas = registerCanvasRef.current;
    const video = registerVideoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedImage(blob);
          stopRegisterCamera();
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const handleRegisterFace = async () => {
    if (!capturedImage || !registerName || !registerEmail) {
      setRegisterError("Please fill in all required fields and capture an image");
      return;
    }

    setIsRegistering(true);
    setRegisterError(null);

    try {
      const file = new File([capturedImage], "face.jpg", { type: "image/jpeg" });
      const createdBy = employee?.id ? `EMP_${employee.id}` : "APP";

      const result = await registerFace(registerName, registerEmail, file, createdBy);

      if (result.success && result.data) {
        // Clear form
        setRegisterName("");
        setRegisterEmail("");
        setRegisterPhone("");
        setCapturedImage(null);

        // Navigate to customer page
        router.push(`/employee/dashboard/customer/${result.data.profile.id}`);
      } else {
        setRegisterError(result.error || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setRegisterError("Registration failed. Please try again.");
    }

    setIsRegistering(false);
  };

  const resetRegisterForm = () => {
    setRegisterName("");
    setRegisterEmail("");
    setRegisterPhone("");
    setCapturedImage(null);
    setRegisterError(null);
    stopRegisterCamera();
  };

  // Handle file upload for face image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setRegisterError("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setRegisterError("Image size should be less than 5MB");
        return;
      }
      setCapturedImage(file);
      stopRegisterCamera();
      setRegisterError(null);
    }
  };

  const handleLogout = async () => {
    stopCamera();
    await logout();
    router.push("/employee");
  };

  if (isLoading) {
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
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-surface-container)" }}
    >
      {/* Employee Header Bar */}
      <header className="sticky top-0 z-40 bg-orange-400 text-white px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
            />
          </svg>
          <span className="text-sm font-medium">
            Employee Mode - {employee?.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-sm text-orange-200 hover:text-white transition-colors flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Exit
          </a>
          <button
            onClick={handleLogout}
            className="text-sm bg-orange-500 hover:bg-orange-400 px-3 py-1 rounded-md transition-colors flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div
            className="inline-flex rounded-2xl p-1.5 gap-1"
            style={{ backgroundColor: "var(--color-surface-container)" }}
          >
            <button
              onClick={() => setActiveTab("customer-scanning")}
              className={`px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                activeTab === "customer-scanning" ? "shadow-md" : "hover:opacity-80"
              }`}
              style={{
                backgroundColor:
                  activeTab === "customer-scanning"
                    ? "var(--color-primary)"
                    : "transparent",
                color:
                  activeTab === "customer-scanning"
                    ? "var(--color-on-primary)"
                    : "var(--color-on-surface-variant)",
              }}
            >
              <span className="material-symbols-outlined text-xl">face</span>
              Scan Customer
            </button>
            <button
              onClick={() => setActiveTab("register-face")}
              className={`px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                activeTab === "register-face" ? "shadow-md" : "hover:opacity-80"
              }`}
              style={{
                backgroundColor:
                  activeTab === "register-face"
                    ? "var(--color-primary)"
                    : "transparent",
                color:
                  activeTab === "register-face"
                    ? "var(--color-on-primary)"
                    : "var(--color-on-surface-variant)",
              }}
            >
              <span className="material-symbols-outlined text-xl">person_add</span>
              Register Face
            </button>
            <button
              onClick={() => setActiveTab("order-management")}
              className={`px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                activeTab === "order-management" ? "shadow-md" : "hover:opacity-80"
              }`}
              style={{
                backgroundColor:
                  activeTab === "order-management"
                    ? "var(--color-primary)"
                    : "transparent",
                color:
                  activeTab === "order-management"
                    ? "var(--color-on-primary)"
                    : "var(--color-on-surface-variant)",
              }}
            >
              <span className="material-symbols-outlined text-xl">receipt_long</span>
              Order Management
            </button>
          </div>
        </div>

        {/* Customer Scanning Tab Content */}
        {activeTab === "customer-scanning" && (
          <>
            <div className="text-center mb-6">
              <h2
                className="text-2xl font-semibold mb-2"
                style={{ color: "var(--color-on-surface)" }}
              >
                Customer Identification
              </h2>
              <p style={{ color: "var(--color-on-surface-variant)" }}>
                Scan a customer's face or search by name
              </p>
            </div>

            {/* Error Message */}
            {error && (
          <div
            className="mb-6 p-4 rounded-2xl text-center max-w-2xl mx-auto"
            style={{
              backgroundColor: "var(--color-error-container)",
              color: "var(--color-on-error-container)",
            }}
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Camera Section */}
          <div
            className="rounded-3xl overflow-hidden lg:col-span-2 shadow-lg"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <div
              className="p-4 border-b"
              style={{ borderColor: "var(--color-outline-variant)" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined"
                  style={{ color: "var(--color-primary)" }}
                >
                  face
                </span>
                <h3
                  className="font-semibold"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  Face Recognition
                </h3>
              </div>
            </div>

            <div className="aspect-[4/3] relative bg-black flex items-center justify-center">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    onLoadedMetadata={(e) => {
                      // Ensure video plays when metadata is loaded
                      (e.target as HTMLVideoElement).play().catch(() => {});
                    }}
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-4 border-white rounded-3xl opacity-50" />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4 mx-auto" />
                          <p>Scanning face...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center p-8">
                  <div
                    className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{
                      backgroundColor: "var(--color-surface-container)",
                    }}
                  >
                    <span
                      className="material-symbols-outlined text-4xl"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      photo_camera
                    </span>
                  </div>
                  <p
                    className="text-lg mb-2"
                    style={{ color: "var(--color-on-surface)" }}
                  >
                    Camera not active
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Click the button below to start scanning
                  </p>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="p-4 flex justify-center gap-3">
              {!isCameraActive ? (
                <button
                  onClick={startCamera}
                  className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-on-primary)",
                  }}
                >
                  <span className="material-symbols-outlined">
                    photo_camera
                  </span>
                  Start Camera
                </button>
              ) : (
                <>
                  <button
                    onClick={captureAndRecognize}
                    disabled={isProcessing}
                    className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--color-primary)",
                      color: "var(--color-on-primary)",
                    }}
                  >
                    <span className="material-symbols-outlined">face</span>
                    {isProcessing ? "Scanning..." : "Scan Face"}
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-4 py-3 rounded-xl font-medium flex items-center gap-2 transition-all hover:opacity-80"
                    style={{
                      backgroundColor: "var(--color-surface-container)",
                      color: "var(--color-on-surface)",
                    }}
                  >
                    <span className="material-symbols-outlined">close</span>
                    Stop
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Column - Search Section */}
          <div
            className="rounded-3xl shadow-lg"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <div
              className="p-4 border-b"
              style={{ borderColor: "var(--color-outline-variant)" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined"
                  style={{ color: "var(--color-primary)" }}
                >
                  search
                </span>
                <h3
                  className="font-semibold"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  Search Customer
                </h3>
              </div>
            </div>

            <div className="p-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all mb-4"
                style={{
                  backgroundColor: "var(--color-surface-container-low)",
                  borderColor: "var(--color-outline-variant)",
                  color: "var(--color-on-surface)",
                }}
              />

              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                </div>
              )}

              {/* Search Results */}
              <div className="max-h-[400px] overflow-y-auto">
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => selectCustomer(customer.id)}
                        className="w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:opacity-80"
                        style={{
                          backgroundColor: "var(--color-surface-container)",
                        }}
                      >
                        {customer.avatarUrl ? (
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                              src={customer.avatarUrl}
                              alt={customer.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: "var(--color-primary-container)",
                            }}
                          >
                            <span
                              className="material-symbols-outlined text-lg"
                              style={{
                                color: "var(--color-on-primary-container)",
                              }}
                            >
                              person
                            </span>
                          </div>
                        )}
                        <div className="text-left flex-1 min-w-0">
                          <p
                            className="font-medium truncate"
                            style={{ color: "var(--color-on-surface)" }}
                          >
                            {customer.name}
                          </p>
                          <p
                            className="text-sm truncate"
                            style={{ color: "var(--color-on-surface-variant)" }}
                          >
                            {customer.email}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p
                            className="text-sm font-medium"
                            style={{ color: "var(--color-primary)" }}
                          >
                            {customer.totalPoints} pts
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: "var(--color-on-surface-variant)" }}
                          >
                            {customer._count?.orders || 0} orders
                          </p>
                        </div>
                        <span
                          className="material-symbols-outlined"
                          style={{ color: "var(--color-on-surface-variant)" }}
                        >
                          chevron_right
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 &&
                  !isSearching &&
                  searchResults.length === 0 && (
                    <div className="text-center py-12">
                      <div
                        className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                        style={{
                          backgroundColor: "var(--color-surface-container)",
                        }}
                      >
                        <span
                          className="material-symbols-outlined text-3xl"
                          style={{ color: "var(--color-on-surface-variant)" }}
                        >
                          person_search
                        </span>
                      </div>
                      <p style={{ color: "var(--color-on-surface-variant)" }}>
                        No customers found
                      </p>
                    </div>
                  )}

                {searchQuery.length < 2 && searchResults.length === 0 && (
                  <div className="text-center py-12">
                    <div
                      className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                      style={{
                        backgroundColor: "var(--color-surface-container)",
                      }}
                    >
                      <span
                        className="material-symbols-outlined text-3xl"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        search
                      </span>
                    </div>
                    <p style={{ color: "var(--color-on-surface-variant)" }}>
                      Type at least 2 characters to search
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
          </>
        )}

        {/* Register Face Tab Content */}
        {activeTab === "register-face" && (
          <>
            <div className="text-center mb-6">
              <h2
                className="text-2xl font-semibold mb-2"
                style={{ color: "var(--color-on-surface)" }}
              >
                Register New Customer
              </h2>
              <p style={{ color: "var(--color-on-surface-variant)" }}>
                Capture a face photo and enter customer details
              </p>
            </div>

            {/* Error Message */}
            {registerError && (
              <div
                className="mb-6 p-4 rounded-2xl text-center max-w-2xl mx-auto"
                style={{
                  backgroundColor: "var(--color-error-container)",
                  color: "var(--color-on-error-container)",
                }}
              >
                {registerError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Left - Camera / Captured Image */}
              <div
                className="rounded-3xl overflow-hidden shadow-lg"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <div
                  className="p-4 border-b"
                  style={{ borderColor: "var(--color-outline-variant)" }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="material-symbols-outlined"
                      style={{ color: "var(--color-primary)" }}
                    >
                      photo_camera
                    </span>
                    <h3
                      className="font-semibold"
                      style={{ color: "var(--color-on-surface)" }}
                    >
                      Face Capture
                    </h3>
                  </div>
                </div>

                <div className="aspect-[4/3] relative bg-black flex items-center justify-center">
                  {capturedImage ? (
                    // Show captured image
                    <img
                      src={URL.createObjectURL(capturedImage)}
                      alt="Captured face"
                      className="w-full h-full object-cover"
                    />
                  ) : isRegisterCameraActive ? (
                    // Show camera feed
                    <>
                      <video
                        ref={registerVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        onLoadedMetadata={(e) => {
                          (e.target as HTMLVideoElement).play().catch(() => {});
                        }}
                      />
                      <canvas ref={registerCanvasRef} className="hidden" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 border-4 border-white rounded-3xl opacity-50" />
                      </div>
                    </>
                  ) : (
                    // Show placeholder
                    <div className="text-center p-8">
                      <div
                        className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                        style={{
                          backgroundColor: "var(--color-surface-container)",
                        }}
                      >
                        <span
                          className="material-symbols-outlined text-4xl"
                          style={{ color: "var(--color-on-surface-variant)" }}
                        >
                          add_a_photo
                        </span>
                      </div>
                      <p
                        className="text-lg mb-2"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        No photo captured
                      </p>
                      <p
                        className="text-sm mb-4"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        Use camera or upload an image
                      </p>
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 mx-auto transition-all hover:opacity-80"
                        style={{
                          backgroundColor: "var(--color-surface-container)",
                          color: "var(--color-on-surface)",
                        }}
                      >
                        <span className="material-symbols-outlined text-lg">upload_file</span>
                        Upload Image
                      </button>
                    </div>
                  )}
                </div>

                {/* Camera Controls */}
                <div className="p-4 flex justify-center gap-3 flex-wrap">
                  {capturedImage ? (
                    <>
                      <button
                        onClick={() => {
                          setCapturedImage(null);
                          startRegisterCamera();
                        }}
                        className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all hover:opacity-90"
                        style={{
                          backgroundColor: "var(--color-surface-container)",
                          color: "var(--color-on-surface)",
                        }}
                      >
                        <span className="material-symbols-outlined">refresh</span>
                        Retake Photo
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all hover:opacity-90"
                        style={{
                          backgroundColor: "var(--color-surface-container)",
                          color: "var(--color-on-surface)",
                        }}
                      >
                        <span className="material-symbols-outlined">upload_file</span>
                        Upload Different
                      </button>
                    </>
                  ) : !isRegisterCameraActive ? (
                    <>
                      <button
                        onClick={startRegisterCamera}
                        className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{
                          backgroundColor: "var(--color-primary)",
                          color: "var(--color-on-primary)",
                        }}
                      >
                        <span className="material-symbols-outlined">photo_camera</span>
                        Start Camera
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{
                          backgroundColor: "var(--color-secondary-container)",
                          color: "var(--color-on-secondary-container)",
                        }}
                      >
                        <span className="material-symbols-outlined">upload_file</span>
                        Upload Image
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={captureRegisterImage}
                        className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{
                          backgroundColor: "var(--color-primary)",
                          color: "var(--color-on-primary)",
                        }}
                      >
                        <span className="material-symbols-outlined">camera</span>
                        Capture
                      </button>
                      <button
                        onClick={stopRegisterCamera}
                        className="px-4 py-3 rounded-xl font-medium flex items-center gap-2 transition-all hover:opacity-80"
                        style={{
                          backgroundColor: "var(--color-surface-container)",
                          color: "var(--color-on-surface)",
                        }}
                      >
                        <span className="material-symbols-outlined">close</span>
                        Stop
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Right - Registration Form */}
              <div
                className="rounded-3xl shadow-lg"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <div
                  className="p-4 border-b"
                  style={{ borderColor: "var(--color-outline-variant)" }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="material-symbols-outlined"
                      style={{ color: "var(--color-primary)" }}
                    >
                      person_add
                    </span>
                    <h3
                      className="font-semibold"
                      style={{ color: "var(--color-on-surface)" }}
                    >
                      Customer Details
                    </h3>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Name */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "var(--color-on-surface)" }}
                    >
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      placeholder="Enter customer name"
                      className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all"
                      style={{
                        backgroundColor: "var(--color-surface-container-low)",
                        borderColor: "var(--color-outline-variant)",
                        color: "var(--color-on-surface)",
                      }}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "var(--color-on-surface)" }}
                    >
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="Enter customer email"
                      className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all"
                      style={{
                        backgroundColor: "var(--color-surface-container-low)",
                        borderColor: "var(--color-outline-variant)",
                        color: "var(--color-on-surface)",
                      }}
                    />
                  </div>

                  {/* Phone (Optional) */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "var(--color-on-surface)" }}
                    >
                      Phone <span className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value)}
                      placeholder="Enter phone number"
                      className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all"
                      style={{
                        backgroundColor: "var(--color-surface-container-low)",
                        borderColor: "var(--color-outline-variant)",
                        color: "var(--color-on-surface)",
                      }}
                    />
                  </div>

                  {/* Buttons */}
                  <div className="pt-4 space-y-3">
                    <button
                      onClick={handleRegisterFace}
                      disabled={isRegistering || !capturedImage || !registerName || !registerEmail}
                      className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
                      style={{
                        backgroundColor: "var(--color-primary)",
                        color: "var(--color-on-primary)",
                      }}
                    >
                      {isRegistering ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                          Registering...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">how_to_reg</span>
                          Register Customer
                        </>
                      )}
                    </button>

                    <button
                      onClick={resetRegisterForm}
                      className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all hover:opacity-80"
                      style={{
                        backgroundColor: "var(--color-surface-container)",
                        color: "var(--color-on-surface)",
                      }}
                    >
                      <span className="material-symbols-outlined">restart_alt</span>
                      Reset Form
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Order Management Tab Content */}
        {activeTab === "order-management" && (
          <div>
            <div className="text-center mb-6">
              <h2
                className="text-2xl font-semibold mb-2"
                style={{ color: "var(--color-on-surface)" }}
              >
                Order Management
              </h2>
              <p style={{ color: "var(--color-on-surface-variant)" }}>
                Drag orders between columns to update their status
              </p>
            </div>

            <OrderKanban />
          </div>
        )}
      </main>

      {/* Match Selection Modal */}
      {showMatchModal && matches.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-xl"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <h3
              className="text-xl font-semibold mb-2 text-center"
              style={{ color: "var(--color-on-surface)" }}
            >
              Select Customer
            </h3>
            <p
              className="text-sm text-center mb-6"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Multiple matches found. Please confirm the customer.
            </p>

            <div className="space-y-3">
              {matches.map((match, index) => (
                <button
                  key={match.profileId}
                  onClick={() => selectCustomer(match.profileId)}
                  className="w-full p-4 rounded-xl flex items-center gap-4 transition-all hover:opacity-80"
                  style={{
                    backgroundColor:
                      index === 0
                        ? "var(--color-primary-container)"
                        : "var(--color-surface-container)",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "var(--color-surface)" }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ color: "var(--color-primary)" }}
                    >
                      person
                    </span>
                  </div>
                  <div className="text-left flex-1">
                    <p
                      className="font-medium"
                      style={{ color: "var(--color-on-surface)" }}
                    >
                      {match.name}
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      {match.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {Math.round(match.similarity * 100)}% match
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowMatchModal(false);
                }}
                className="flex-1 py-3 rounded-xl font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: "var(--color-surface-container)",
                  color: "var(--color-on-surface)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
