'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEmployee } from '@/context/EmployeeContext';

export default function EmployeeLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, sessionExpired, clearSessionExpired } = useEmployee();

  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/employee/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Clear session expired when user starts entering credentials
  useEffect(() => {
    if (employeeId || pin) {
      clearSessionExpired();
    }
  }, [employeeId, pin, clearSessionExpired]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
    }
  };

  const handlePinDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handlePinClear = () => {
    setPin('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!employeeId.trim()) {
      setLocalError('Please enter your Employee ID');
      return;
    }

    if (!pin || pin.length < 4) {
      setLocalError('Please enter your PIN (at least 4 digits)');
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await login(employeeId.trim(), pin);

      if (success) {
        router.push('/employee/dashboard');
      } else {
        setLocalError(error || 'Invalid credentials');
      }
    } catch {
      setLocalError('Login failed. Please try again.');
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-container)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-surface-container)' }}>
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: 'var(--color-primary-container)' }}>
            <span className="material-symbols-outlined text-3xl" style={{ color: 'var(--color-on-primary-container)' }}>
              badge
            </span>
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-on-surface)' }}>Employee Login</h1>
          <p className="mt-2" style={{ color: 'var(--color-on-surface-variant)' }}>Enter your credentials to continue</p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl p-6 shadow-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee ID */}
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-on-surface)' }}>
                Employee ID
              </label>
              <input
                type="text"
                id="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Enter your Employee ID"
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: 'var(--color-surface-container-low)',
                  borderColor: 'var(--color-outline-variant)',
                  color: 'var(--color-on-surface)',
                }}
                disabled={isSubmitting}
              />
            </div>

            {/* PIN Display */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-on-surface)' }}>
                PIN
              </label>
              <div className="flex justify-center gap-3 mb-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold transition-all"
                    style={{
                      backgroundColor: pin[i] ? 'var(--color-primary-container)' : 'var(--color-surface-container-low)',
                      color: pin[i] ? 'var(--color-on-primary-container)' : 'var(--color-on-surface-variant)',
                      border: `2px solid ${pin[i] ? 'var(--color-primary)' : 'var(--color-outline-variant)'}`,
                    }}
                  >
                    {pin[i] ? '*' : ''}
                  </div>
                ))}
              </div>

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePinInput(String(num))}
                    className="h-14 rounded-xl text-xl font-semibold transition-all hover:opacity-80 active:scale-95"
                    style={{
                      backgroundColor: 'var(--color-surface-container)',
                      color: 'var(--color-on-surface)',
                    }}
                    disabled={isSubmitting}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handlePinClear}
                  className="h-14 rounded-xl text-sm font-medium transition-all hover:opacity-80 active:scale-95"
                  style={{
                    backgroundColor: 'var(--color-error-container)',
                    color: 'var(--color-on-error-container)',
                  }}
                  disabled={isSubmitting}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handlePinInput('0')}
                  className="h-14 rounded-xl text-xl font-semibold transition-all hover:opacity-80 active:scale-95"
                  style={{
                    backgroundColor: 'var(--color-surface-container)',
                    color: 'var(--color-on-surface)',
                  }}
                  disabled={isSubmitting}
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinDelete}
                  className="h-14 rounded-xl text-sm font-medium transition-all hover:opacity-80 active:scale-95 flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--color-surface-container)',
                    color: 'var(--color-on-surface)',
                  }}
                  disabled={isSubmitting}
                >
                  <span className="material-symbols-outlined">backspace</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {(localError || error) && (
              <div className="p-3 rounded-xl text-center text-sm" style={{ backgroundColor: 'var(--color-error-container)', color: 'var(--color-on-error-container)' }}>
                {localError || error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !employeeId || !pin}
              className="w-full py-4 rounded-xl font-semibold text-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-on-primary)',
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Logging in...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">login</span>
                  Login
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back to home link */}
        <div className="text-center mt-6">
          <a href="/" className="text-sm hover:underline" style={{ color: 'var(--color-primary)' }}>
            Back to Customer View
          </a>
        </div>
      </div>
    </div>
  );
}
