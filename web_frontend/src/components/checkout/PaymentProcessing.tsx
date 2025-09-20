'use client';

import { useState, useEffect } from 'react';
import { PaymentMethod } from '@/types';
import { getPaymentMethodLabel } from '@/lib/utils';

interface PaymentProcessingProps {
  method: PaymentMethod;
  total: number;
  onComplete: () => void;
}

type ProcessingState = 'processing' | 'success';

export function PaymentProcessing({ method, total, onComplete }: PaymentProcessingProps) {
  const [state, setState] = useState<ProcessingState>('processing');

  useEffect(() => {
    // Simulate processing time (2-3 seconds)
    const processingTimer = setTimeout(() => {
      setState('success');
    }, 2000 + Math.random() * 1000);

    return () => clearTimeout(processingTimer);
  }, []);

  useEffect(() => {
    // Auto-proceed after success animation
    if (state === 'success') {
      const successTimer = setTimeout(() => {
        onComplete();
      }, 1500);

      return () => clearTimeout(successTimer);
    }
  }, [state, onComplete]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
        {state === 'processing' ? (
          <>
            {/* Processing Animation */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-2">Processing Payment</h2>
            <p className="text-gray-500 mb-4">
              Please wait while we process your {getPaymentMethodLabel(method)} payment...
            </p>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-500">Amount</div>
              <div className="text-2xl font-bold text-gray-800">₹{total.toFixed(2)}</div>
            </div>
          </>
        ) : (
          <>
            {/* Success Animation */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-bounce-once">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
            <p className="text-gray-500 mb-4">
              Your payment of ₹{total.toFixed(2)} has been processed successfully.
            </p>

            <div className="text-sm text-gray-400">Redirecting to order confirmation...</div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes bounce-once {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-bounce-once {
          animation: bounce-once 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
