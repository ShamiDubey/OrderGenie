'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { recognizeFace } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleLogin = async () => {
    if (!selectedFile) {
      setError('Please select an image');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await recognizeFace(selectedFile);

      // The API returns { success: true, data: { matches: [...], processingTimeS, thresholds } }
      const matches = (result.data as any)?.matches;

      if (result.success && matches && matches.length > 0) {
        // Get the best match (first result, highest similarity)
        const bestMatch = matches[0];

        if (bestMatch.similarity >= 0.4) {
          // Login successful - construct the profile from match data
          const profile = {
            id: bestMatch.profileId,
            name: bestMatch.name,
            email: bestMatch.email,
            username: bestMatch.username || null,
            phone: bestMatch.phone || null,
            totalPoints: bestMatch.totalPoints || 0,
            avatarUrl: bestMatch.avatarUrl || null,
            dietaryPreference: bestMatch.dietaryPreference || 'none',
            hideNonVeg: bestMatch.hideNonVeg || false,
            religion: bestMatch.religion || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          login(profile);
          router.push('/');
        } else {
          setError('Face not recognized with high enough confidence. Please try again or register.');
        }
      } else {
        setError('No matching face found. Please register first or try a different photo.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to recognize face. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Face Login</h1>
            <p className="text-gray-500 mt-2">Sign in using your face</p>
          </div>

          <div className="space-y-6">
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                preview ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <div className="relative w-40 h-40 mx-auto">
                  <Image
                    src={preview}
                    alt="Preview"
                    fill
                    className="object-cover rounded-xl"
                  />
                </div>
              ) : (
                <div className="text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="font-medium">Click to upload your photo</p>
                  <p className="text-sm text-gray-400 mt-1">JPG, PNG up to 10MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleLogin}
                disabled={!selectedFile || loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Recognizing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign In
                  </>
                )}
              </button>

              {selectedFile && (
                <button
                  onClick={handleReset}
                  className="px-4 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-blue-600 font-medium hover:underline">
                Register your face
              </Link>
            </p>
          </div>
        </div>

        {/* Guest Option */}
        <div className="text-center mt-6">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            Continue as guest
          </Link>
        </div>
      </div>
    </div>
  );
}
