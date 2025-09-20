'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/stores';
import { useAuth } from '@/context/AuthContext';
import { createOrder, getProfileById } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NormalizedOrder, normalizeOrder } from '@/lib/normalizers';
import { PaymentSelection, PaymentProcessing, PointsCelebration } from '@/components/checkout';
import { PaymentMethod, OrderType } from '@/types';

type CheckoutStep = 'details' | 'payment' | 'processing' | 'celebration' | 'confirmation';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotal, getDiscountTotal, getSubtotal, clearCart, isHydrated } = useCartStore();
  const { user, isAuthenticated, setUserTotalPoints } = useAuth();

  const [step, setStep] = useState<CheckoutStep>('details');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<NormalizedOrder | null>(null);

  const total = getTotal();
  const discount = getDiscountTotal();
  const subtotal = getSubtotal();

  // Calculate total points that will be earned (default to 50 per product if not set)
  const totalPointsToEarn = items.reduce(
    (sum, item) => sum + ((item.product.royaltyPoints || 50) * item.quantity),
    0
  );

  // Pre-fill user details if logged in
  useEffect(() => {
    if (user) {
      setCustomerName(user.name);
      setCustomerEmail(user.email);
    }
  }, [user]);

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (items.length === 0) {
      setError('Your cart is empty');
      return;
    }

    setError(null);
    setStep('payment');
  };

  const handlePaymentProceed = () => {
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    setError(null);
    setStep('processing');
  };

  const handlePaymentComplete = async () => {
    setLoading(true);
    setError(null);

    try {
      const orderData = {
        profileId: user?.id,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        orderType,
        paymentMethod: paymentMethod!,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      const result = await createOrder(orderData);

      if (result.success && result.data) {
        const normalizedOrder = normalizeOrder(result.data);
        setCompletedOrder(normalizedOrder);
        clearCart();

        // Show celebration screen if user is authenticated and earned points
        // Use pointsEarned from API response (more accurate than cart calculation)
        const earnedPoints = normalizedOrder.pointsEarned || 0;
        if (isAuthenticated && earnedPoints > 0) {
          setStep('celebration');
        } else {
          setStep('confirmation');
        }
      } else {
        setError(result.error || 'Failed to place order. Please try again.');
        setStep('payment');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('An error occurred. Please try again.');
      setStep('payment');
    } finally {
      setLoading(false);
    }
  };

  // Wait for hydration
  if (!isHydrated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="bg-white rounded-xl shadow-sm p-6 h-96"></div>
        </div>
      </div>
    );
  }

  // Points Celebration Screen
  if (step === 'celebration' && completedOrder && isAuthenticated && user) {
    const earnedPoints = completedOrder.pointsEarned || 0;
    return (
      <PointsCelebration
        pointsEarned={earnedPoints}
        orderNumber={completedOrder.orderNumber}
        onComplete={async () => {
          // Fetch user's latest points from the server
          try {
            const profileResult = await getProfileById(user.id);
            if (profileResult.success && profileResult.data) {
              setUserTotalPoints(profileResult.data.totalPoints);
            }
          } catch (error) {
            console.error('Failed to refresh user points:', error);
          }
          setStep('confirmation');
        }}
      />
    );
  }

  // Order Confirmation Screen
  if (step === 'confirmation' && completedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Placed!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your order, {completedOrder.customerName}!
          </p>

          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="text-sm text-gray-500 mb-2">Order Number</div>
            <div className="text-2xl font-bold text-blue-600">{completedOrder.orderNumber}</div>
          </div>

          {/* Points Earned Banner */}
          {isAuthenticated && completedOrder.pointsEarned && completedOrder.pointsEarned > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-amber-700">
                <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="font-semibold">
                  +{completedOrder.pointsEarned} points added to your account!
                </span>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
            <h3 className="font-semibold text-gray-800 mb-4">Order Summary</h3>
            <div className="space-y-2">
              {completedOrder.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.productName} x{item.quantity}
                  </span>
                  <span className="font-medium">₹{item.lineTotal.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>₹{completedOrder.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {isAuthenticated && (
              <Link
                href="/orders"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                View My Orders
              </Link>
            )}
            <Link
              href="/products"
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Empty Cart
  if (items.length === 0 && step !== 'confirmation') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Add items to your cart before checking out.</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  // Processing Modal
  if (step === 'processing' && paymentMethod) {
    return (
      <PaymentProcessing
        method={paymentMethod}
        total={total}
        onComplete={handlePaymentComplete}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${step === 'details' ? 'text-blue-600' : 'text-green-600'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'details' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
          }`}>
            {step === 'details' ? '1' : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span className="font-medium hidden sm:inline">Details</span>
        </div>

        <div className={`w-12 h-0.5 ${step !== 'details' ? 'bg-green-500' : 'bg-gray-300'}`} />

        <div className={`flex items-center gap-2 ${
          step === 'payment' ? 'text-blue-600' : step === 'details' ? 'text-gray-400' : 'text-green-600'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'payment' ? 'bg-blue-100 text-blue-600' :
            step === 'details' ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-600'
          }`}>
            2
          </div>
          <span className="font-medium hidden sm:inline">Payment</span>
        </div>
      </div>

      {step === 'details' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Customer Details Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-6">Customer Details</h2>

              {!isAuthenticated && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-700">
                    <Link href="/login" className="font-semibold hover:underline">
                      Login with your face
                    </Link>{' '}
                    to save your order history and earn royalty points!
                  </p>
                </div>
              )}

              <form onSubmit={handleDetailsSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Enter your email (optional)"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter your phone number (optional)"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Instructions
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests or instructions..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={loading}
                  />
                </div>

                {/* Order Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Order Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setOrderType('DINE_IN')}
                      disabled={loading}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        orderType === 'DINE_IN'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">restaurant</span>
                      <span className="text-sm font-medium">Dine In</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('PICKUP')}
                      disabled={loading}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        orderType === 'PICKUP'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">shopping_bag</span>
                      <span className="text-sm font-medium">Pickup</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('TAKEAWAY')}
                      disabled={loading}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        orderType === 'TAKEAWAY'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">drive_eta</span>
                      <span className="text-sm font-medium">Takeaway</span>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  Continue to Payment
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </form>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Order Summary</h2>

              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-3">
                    <div className="relative w-14 h-14 flex-shrink-0">
                      {item.product.imageUrl ? (
                        <Image
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          fill
                          className="object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 rounded-lg" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-sm font-medium text-gray-800">
                      ₹{(item.product.effectivePrice * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-bold text-gray-800">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Points Preview */}
              {isAuthenticated && totalPointsToEarn > 0 && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700 text-sm">
                    <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span>Earn <strong>{totalPointsToEarn}</strong> points</span>
                  </div>
                </div>
              )}

              <Link
                href="/cart"
                className="block w-full mt-4 text-center text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Edit Cart
              </Link>
            </div>
          </div>
        </div>
      )}

      {step === 'payment' && (
        <div className="max-w-xl mx-auto">
          <PaymentSelection
            selectedMethod={paymentMethod}
            onSelect={setPaymentMethod}
            onBack={() => setStep('details')}
            onProceed={handlePaymentProceed}
            total={total}
          />

          {error && (
            <div className="mt-4 bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
