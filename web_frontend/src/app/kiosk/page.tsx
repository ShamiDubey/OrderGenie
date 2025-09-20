"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useKiosk } from "@/context/KioskContext";
import { recognizeFace, loginProfile, registerFace, getCategories, getProducts } from "@/lib/api";
import { User, Camera, KeyRound, X, Loader2, UserPlus, ArrowRight, Lock, ChevronRight, Volume2, VolumeX, ScanFace, ShoppingBag } from "lucide-react";

type ModalState = "none" | "face-scan" | "login" | "no-match" | "register" | "video";

export default function KioskEntryPage() {
  const router = useRouter();
  const { loginUser, setGuestMode, setPreloadedData, isDataPreloaded } = useKiosk();

  const [modalState, setModalState] = useState<ModalState>("none");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [capturedImage, setCapturedImage] = useState<File | null>(null);

  // Welcome video ref
  const welcomeVideoRef = useRef<HTMLVideoElement>(null);
  const [videoFading, setVideoFading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Could not access camera. Please allow camera permissions.");
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Capture image from camera
  const captureImage = useCallback((): File | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const byteString = atob(dataUrl.split(",")[1]);
    const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new File([ab], "capture.jpg", { type: mimeString });
  }, []);

  // Handle guest continue
  const handleGuestContinue = () => {
    setGuestMode();
    setModalState("video");
  };

  // Handle face scan
  const handleFaceScan = () => {
    setModalState("face-scan");
    setError(null);
    setTimeout(startCamera, 100);
  };

  // Handle face capture and recognition
  const handleFaceCapture = async () => {
    const image = captureImage();
    if (!image) {
      setError("Failed to capture image");
      return;
    }

    setCapturedImage(image);
    setIsLoading(true);
    setError(null);

    try {
      const result = await recognizeFace(image);

      if (result.success && result.data && result.data.length > 0) {
        // Face matched - login user
        const match = result.data[0];
        stopCamera();
        loginUser(match.profile);
        setModalState("video");
      } else {
        // No match found - show options
        stopCamera();
        setModalState("no-match");
      }
    } catch (err) {
      setError("Face recognition failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      setError("Please enter username and password");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await loginProfile(loginUsername, loginPassword);

      if (result.success && result.data) {
        loginUser(result.data);
        setModalState("video");
      } else {
        setError(result.error || "Invalid username or password");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle register new customer
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName || !registerEmail || !capturedImage) {
      setError("Please fill all fields");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await registerFace(registerName, registerEmail, capturedImage, "KIOSK");

      if (result.success && result.data) {
        loginUser(result.data.profile);
        setModalState("video");
      } else {
        setError(result.error || "Registration failed");
      }
    } catch (err) {
      setError("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle no-match options
  const handleNoMatchRegister = () => {
    setModalState("register");
    setError(null);
  };

  const handleNoMatchGuest = () => {
    setCapturedImage(null);
    setGuestMode();
    setModalState("video");
  };

  // Preload order page data when video starts
  const preloadOrderData = useCallback(async () => {
    if (isPreloading || isDataPreloaded) return;
    setIsPreloading(true);
    try {
      // Preload categories and products and store in context
      const [catResult, prodResult] = await Promise.all([
        getCategories(),
        getProducts({ available: true }),
      ]);

      const categories = catResult.success && catResult.data
        ? catResult.data.filter((c) => c.isActive)
        : [];
      const products = prodResult.success && prodResult.data
        ? prodResult.data
        : [];

      setPreloadedData(categories, products);
    } catch (err) {
      console.error("Preload failed:", err);
    }
  }, [isPreloading, isDataPreloaded, setPreloadedData]);

  // Start preloading when video screen shows
  useEffect(() => {
    if (modalState === "video") {
      preloadOrderData();
    }
  }, [modalState, preloadOrderData]);

  // Handle video end
  const handleVideoEnd = () => {
    setVideoFading(true);
    router.push("/kiosk/order");
  };

  // Skip video
  const handleSkipVideo = () => {
    setVideoFading(true);
    router.push("/kiosk/order");
  };

  // Toggle mute
  const toggleMute = () => {
    if (welcomeVideoRef.current) {
      welcomeVideoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Close modal
  const closeModal = () => {
    stopCamera();
    setModalState("none");
    setError(null);
    setLoginUsername("");
    setLoginPassword("");
    setRegisterName("");
    setRegisterEmail("");
    setCapturedImage(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Welcome video screen
  if (modalState === "video") {
    return (
      <div
        className={`fixed inset-0 bg-black flex items-center justify-center transition-opacity duration-500 ${
          videoFading ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* Logo top-left */}
        <div className="absolute top-8 left-8 flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[#E8DFD0] flex items-center justify-center">
            <span className="text-[#5C4033] text-xl">☕</span>
          </div>
          <div>
            <div className="text-white font-bold text-xl tracking-wide">BARISTA</div>
            <div className="text-[#A89080] text-xs tracking-[0.2em]">— ARTISAN COFFEE</div>
          </div>
        </div>

        <video
          ref={welcomeVideoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          onEnded={handleVideoEnd}
          onError={handleVideoEnd}
        >
          <source src="/starter.mp4" type="video/mp4" />
          <source src="/starter.mov" type="video/quicktime" />
        </video>

        {/* Bottom controls */}
        <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between">
          {/* Mute/Unmute button */}
          <button
            onClick={toggleMute}
            className="flex items-center gap-2 px-4 py-3 bg-[#2D2520]/80 hover:bg-[#2D2520] rounded-full text-white transition-colors backdrop-blur-sm"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-5 h-5" />
                <span className="text-sm font-medium">Unmute</span>
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5" />
                <span className="text-sm font-medium">Mute</span>
              </>
            )}
          </button>

          {/* Skip button */}
          <button
            onClick={handleSkipVideo}
            className="flex items-center gap-3 px-6 py-4 bg-[#E8DFD0] hover:bg-[#DDD0C0] rounded-full text-[#5C4033] transition-colors"
          >
            <div className="text-left">
              <div className="font-semibold">Skip Intro</div>
              <div className="text-xs text-[#8B7355] uppercase tracking-wider">Touch to Order</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#8B6B4F] flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#2D2520] via-[#1E1915] to-[#151210]">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-32 h-32 rounded-full bg-[#E8DFD0] border-4 border-[#A89080] flex items-center justify-center mx-auto">
          <div className="text-center">
            <span className="text-4xl">☕</span>
            <div className="text-[10px] text-[#5C4033] font-medium mt-1">BARISTA CAFE</div>
          </div>
        </div>
      </div>

      {/* Welcome Text */}
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-serif italic text-white mb-3">Welcome to Barista</h1>
        <p className="text-lg text-[#A89080]">How would you like to order today?</p>
      </div>

      {/* Option Buttons - Horizontal Layout */}
      <div className="grid grid-cols-3 gap-6 w-full max-w-4xl px-4">
        {/* Guest Order */}
        <button
          onClick={handleGuestContinue}
          className="flex flex-col items-center gap-4 p-8 bg-[#3D3530]/80 hover:bg-[#4D4540]/80 rounded-3xl transition-all duration-200 active:scale-[0.98] border border-[#5D5550]/30 group"
        >
          <div className="w-20 h-20 rounded-2xl bg-[#4D4540] group-hover:bg-[#5D5550] flex items-center justify-center transition-colors">
            <ShoppingBag className="w-10 h-10 text-[#C4A77D]" />
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white mb-1">Guest Order</div>
            <div className="text-sm text-[#A89080]">Quick checkout</div>
          </div>
        </button>

        {/* Face Scan */}
        <button
          onClick={handleFaceScan}
          className="flex flex-col items-center gap-4 p-8 bg-[#3D3530]/80 hover:bg-[#4D4540]/80 rounded-3xl transition-all duration-200 active:scale-[0.98] border border-[#5D5550]/30 group"
        >
          <div className="w-20 h-20 rounded-2xl bg-[#4D4540] group-hover:bg-[#5D5550] flex items-center justify-center transition-colors">
            <ScanFace className="w-10 h-10 text-[#C4A77D]" />
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white mb-1">Face Scan</div>
            <div className="text-sm text-[#A89080]">Quick recognition</div>
          </div>
        </button>

        {/* Member Login */}
        <button
          onClick={() => { setModalState("login"); setError(null); }}
          className="flex flex-col items-center gap-4 p-8 bg-[#3D3530]/80 hover:bg-[#4D4540]/80 rounded-3xl transition-all duration-200 active:scale-[0.98] border border-[#5D5550]/30 group"
        >
          <div className="w-20 h-20 rounded-2xl bg-[#4D4540] group-hover:bg-[#5D5550] flex items-center justify-center transition-colors">
            <KeyRound className="w-10 h-10 text-[#C4A77D]" />
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white mb-1">Member Login</div>
            <div className="text-sm text-[#A89080]">Earn rewards</div>
          </div>
        </button>
      </div>

      {/* Version Footer */}
      <div className="absolute bottom-6 text-center">
        <span className="text-sm text-[#6D6560]">v2.4.1 • Accessibility Options</span>
      </div>

      {/* Face Scan Modal */}
      {modalState === "face-scan" && (
        <div className="fixed inset-0 bg-[#1E1915]/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 text-center relative">
              <h2 className="text-2xl font-bold text-[#5C4033]">Face Scan</h2>
              <p className="text-[#8B7355] mt-1">Position your face within the frame</p>
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Camera Area */}
            <div className="relative bg-black mx-6 rounded-2xl overflow-hidden aspect-[4/5]">
              {/* Live Camera Badge */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-[#2D2520] px-3 py-1 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-white text-xs font-medium">LIVE CAMERA</span>
              </div>

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Face guide overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Oval dashed border */}
                <div className="w-52 h-72 border-2 border-dashed border-white/40 rounded-[50%]" />
                {/* Corner brackets */}
                <div className="absolute w-60 h-80">
                  {/* Top-left */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg" />
                  {/* Top-right */}
                  <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg" />
                  {/* Bottom-left */}
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg" />
                  {/* Bottom-right */}
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg" />
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="p-6">
              {error && (
                <div className="text-red-600 text-center mb-4 p-3 bg-red-50 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleFaceCapture}
                disabled={isLoading}
                className="w-full py-4 bg-[#8B6B4F] hover:bg-[#7A5A3E] disabled:bg-gray-300 rounded-full text-white font-semibold text-lg transition-colors flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    Capture & Recognize
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                By proceeding, you agree to our <span className="underline">Privacy Policy</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Match Modal */}
      {modalState === "no-match" && (
        <div className="fixed inset-0 bg-[#2D2520]/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md text-center shadow-2xl">
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🚫</span>
            </div>

            <h2 className="text-2xl font-bold text-[#2D2520] mb-2">No Match Found</h2>
            <p className="text-[#6D6560] mb-6">
              We couldn&apos;t recognize you.<br />
              What would you like to do?
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleNoMatchRegister}
                className="flex-1 py-4 px-6 bg-[#8B6B4F] hover:bg-[#7A5A3E] rounded-2xl text-white font-semibold transition-colors flex flex-col items-center gap-2"
              >
                <UserPlus className="w-6 h-6" />
                Register
              </button>
              <button
                onClick={handleNoMatchGuest}
                className="flex-1 py-4 px-6 bg-gray-100 hover:bg-gray-200 rounded-2xl text-[#5C4033] font-semibold transition-colors flex flex-col items-center gap-2"
              >
                <User className="w-6 h-6" />
                Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {modalState === "register" && (
        <div className="fixed inset-0 bg-[#1E1915]/90 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2D2520] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-[#4D4540]">
            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-bold text-white">Register New Account</h2>
                  <p className="text-[#A89080] mt-1">Join us for exclusive rewards and faster ordering.</p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full bg-[#4D4540] hover:bg-[#5D5550] flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-[#A89080]" />
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-4 mt-6">
                <div>
                  <label className="block text-xs text-[#A89080] mb-2 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full px-4 py-4 bg-[#3D3530] border border-[#5D5550] rounded-xl text-white text-lg focus:outline-none focus:border-[#C4A77D] placeholder-[#6D6560]"
                    placeholder="e.g. Alex Barista"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A89080] mb-2 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="w-full px-4 py-4 bg-[#3D3530] border border-[#5D5550] rounded-xl text-white text-lg focus:outline-none focus:border-[#C4A77D] placeholder-[#6D6560]"
                    placeholder="alex@example.com"
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-center p-3 bg-red-400/10 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-[#C4A77D] hover:bg-[#B39770] disabled:bg-[#5D5550] rounded-full text-[#2D2520] font-semibold text-lg transition-colors flex items-center justify-center gap-2 mt-6"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account & Continue
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {modalState === "login" && (
        <div className="fixed inset-0 bg-[#1E1915]/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            {/* Brown Header */}
            <div className="bg-gradient-to-r from-[#A67C52] to-[#8B6B4F] p-6 relative">
              {/* Coffee cup decoration */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">
                <span className="text-6xl">☕</span>
              </div>
              <h2 className="text-2xl font-bold text-white text-center">Barista Login</h2>
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 bg-[#FDF8F3]">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-[#5C4033] mb-2 font-medium">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A89080]" />
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-[#F5F0E8] border border-[#E0D5C5] rounded-xl text-[#2D2520] text-lg focus:outline-none focus:border-[#A67C52] placeholder-[#A89080]"
                      placeholder="Enter your username"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[#5C4033] mb-2 font-medium">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A89080]" />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-[#F5F0E8] border border-[#E0D5C5] rounded-xl text-[#2D2520] text-lg focus:outline-none focus:border-[#A67C52] placeholder-[#A89080]"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-red-600 text-center p-3 bg-red-50 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-[#8B6B4F] hover:bg-[#7A5A3E] disabled:bg-gray-300 rounded-full text-white font-semibold text-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </button>

                <p className="text-center text-[#A67C52] text-sm hover:underline cursor-pointer mt-2">
                  Forgot Password?
                </p>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
