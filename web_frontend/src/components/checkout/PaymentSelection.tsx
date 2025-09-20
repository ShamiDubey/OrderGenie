'use client';

import { PaymentMethod } from '@/types';

interface PaymentOption {
  method: PaymentMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const paymentOptions: PaymentOption[] = [
  {
    method: 'PAY_ON_COUNTER',
    label: 'Pay on Counter',
    description: 'Pay with cash or card at the counter',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    method: 'CREDIT_CARD',
    label: 'Credit Card',
    description: 'Visa, Mastercard, American Express',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    method: 'DEBIT_CARD',
    label: 'Debit Card',
    description: 'Direct bank account payment',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    method: 'UPI',
    label: 'UPI',
    description: 'Pay using UPI ID',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10.5 2L6 12l4.5 10h3L9 12l4.5-10h-3zm3 0L9 12l4.5 10h3L12 12l4.5-10h-3z" />
      </svg>
    ),
  },
  {
    method: 'APPLE_PAY',
    label: 'Apple Pay',
    description: 'Pay with your Apple device',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.08-.47-2.07-.48-3.2 0-1.42.62-2.18.44-3.03-.35C3.35 15.63 4.04 9.11 9.18 8.87c1.23.08 2.07.67 2.79.72.98-.2 1.93-.76 3-.82 1.41-.09 2.69.48 3.45 1.36-3.04 1.83-2.31 5.83.76 6.95-.62 1.61-1.42 3.2-2.13 4.2zM12.3 8.8c-.11-2.26 1.79-4.11 4-4.3.28 2.33-2.11 4.38-4 4.3z" />
      </svg>
    ),
  },
  {
    method: 'GOOGLE_PAY',
    label: 'Google Pay',
    description: 'Pay with your Google account',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.999 2 2.545 6.477 2.545 12s4.454 10 10 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
      </svg>
    ),
  },
  {
    method: 'UPI_APPS',
    label: 'UPI Apps',
    description: 'PhonePe, Paytm, BHIM & more',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
];

interface PaymentSelectionProps {
  selectedMethod: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  onBack: () => void;
  onProceed: () => void;
  total: number;
}

export function PaymentSelection({
  selectedMethod,
  onSelect,
  onBack,
  onProceed,
  total,
}: PaymentSelectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Select Payment Method</h2>

      <div className="grid gap-3">
        {paymentOptions.map((option) => (
          <button
            key={option.method}
            type="button"
            onClick={() => onSelect(option.method)}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              selectedMethod === option.method
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div
              className={`p-3 rounded-full ${
                selectedMethod === option.method
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {option.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800">{option.label}</h3>
              <p className="text-sm text-gray-500">{option.description}</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedMethod === option.method
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300'
              }`}
            >
              {selectedMethod === option.method && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Order Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Amount</span>
          <span className="text-2xl font-bold text-gray-800">₹{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onProceed}
          disabled={!selectedMethod}
          className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Pay Now
        </button>
      </div>
    </div>
  );
}
