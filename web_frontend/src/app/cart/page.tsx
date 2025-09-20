'use client';

import { useCartStore } from '@/stores';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { formatPoints } from '@/lib/utils';

export default function CartPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    getTotal,
    getDiscountTotal,
    getSubtotal,
    isHydrated
  } = useCartStore();
  const { user, isAuthenticated } = useAuth();

  const total = getTotal();
  const discount = getDiscountTotal();
  const subtotal = getSubtotal();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPoints = items.reduce((sum, item) => sum + (item.product.royaltyPoints || 50) * item.quantity, 0);

  // Wait for hydration to avoid hydration mismatch
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              <div className="flex-1 w-full space-y-6">
                <div className="h-10 w-64 skeleton" />
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-[var(--color-surface)] p-4 rounded-xl flex gap-4">
                      <div className="w-28 h-28 skeleton rounded-lg" />
                      <div className="flex-1 space-y-3">
                        <div className="h-5 w-40 skeleton" />
                        <div className="h-4 w-32 skeleton" />
                        <div className="h-6 w-20 skeleton" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full lg:w-[400px]">
                <div className="bg-[var(--color-surface)] rounded-xl p-6 h-80 skeleton" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center">
            <div className="w-24 h-24 bg-[var(--color-bg-tertiary)] rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-[var(--color-text-muted)]" style={{ fontSize: '48px' }}>
                shopping_cart
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">Your cart is empty</h2>
            <p className="text-[var(--color-text-secondary)] mb-8">Add some delicious items to get started!</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[var(--color-primary-hover)] transition-all shadow-lg shadow-[var(--color-primary)]/20"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>restaurant_menu</span>
              Browse Menu
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Left Column: Cart Items */}
            <div className="flex-1 w-full flex flex-col gap-6">
              {/* Page Heading */}
              <div className="flex flex-col gap-1 pb-2 border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight text-[var(--color-text)]">
                    Your Cart{' '}
                    <span className="text-[var(--color-primary)] font-bold text-2xl align-middle">
                      ({itemCount} item{itemCount !== 1 ? 's' : ''})
                    </span>
                  </h1>
                  <button
                    onClick={clearCart}
                    className="text-sm text-[var(--color-error)] hover:text-[var(--color-error)]/80 font-medium flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete_sweep</span>
                    Clear All
                  </button>
                </div>
                <p className="text-[var(--color-text-secondary)] text-base">Review your order before checkout.</p>
              </div>

              {/* Cart List */}
              <div className="flex flex-col gap-4">
                {items.map((item) => {
                  const { product } = item;
                  return (
                    <div
                      key={product.id}
                      className="flex flex-col sm:flex-row gap-4 bg-[var(--color-surface)] p-4 rounded-xl shadow-sm border border-transparent hover:border-[var(--color-primary)]/10 transition-all"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        {/* Product Image */}
                        <div className="shrink-0 relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-[var(--color-bg-tertiary)]">
                          {product.imageUrl || product.thumbnailUrl ? (
                            <Image
                              src={product.thumbnailUrl || product.imageUrl!}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-[var(--color-text-muted)]" style={{ fontSize: '32px' }}>
                                image
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex flex-col h-full justify-between py-1">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-lg font-bold leading-tight text-[var(--color-text)]">{product.name}</p>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-sm mb-2">
                              <span>{product.category?.name || 'Uncategorized'}</span>
                              <span className="text-[var(--color-border)]">•</span>
                              <div className={`food-indicator ${product.isVeg ? 'food-indicator-veg' : 'food-indicator-nonveg'}`} style={{ width: '14px', height: '14px' }} />
                            </div>
                            <span className="points-badge">
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>loyalty</span>
                              +{(product.royaltyPoints || 50) * item.quantity} Points
                            </span>
                          </div>
                          <div className="block sm:hidden mt-3 font-bold text-lg text-[var(--color-text)]">
                            ₹{(product.effectivePrice * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Right side: Price and Controls */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 sm:gap-6 shrink-0 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border-light)]">
                        <div className="hidden sm:block text-lg font-bold text-right text-[var(--color-text)]">
                          ₹{(product.effectivePrice * item.quantity).toFixed(2)}
                        </div>
                        <div className="flex items-center gap-4">
                          {/* Quantity Controls */}
                          <div className="flex items-center rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-1">
                            <button
                              onClick={() => updateQuantity(product.id, item.quantity - 1)}
                              className="size-8 flex items-center justify-center rounded-md hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-colors"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>remove</span>
                            </button>
                            <span className="w-8 text-center font-medium text-sm text-[var(--color-text)]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id, item.quantity + 1)}
                              className="size-8 flex items-center justify-center rounded-md hover:bg-[var(--color-surface)] text-[var(--color-primary)] font-bold transition-colors"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                            </button>
                          </div>
                          {/* Remove Button */}
                          <button
                            onClick={() => removeItem(product.id)}
                            className="size-8 flex items-center justify-center rounded-lg text-[var(--color-error)]/60 hover:text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors"
                            title="Remove item"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Summary Sidebar */}
            <div className="w-full lg:w-[400px] shrink-0 lg:sticky lg:top-24">
              <div className="bg-[var(--color-surface)] rounded-xl shadow-lg border border-[var(--color-border-light)] p-6 flex flex-col gap-6">
                {/* Face ID Recognition */}
                {isAuthenticated && user && (
                  <div className="flex items-center gap-3 bg-gradient-to-r from-[var(--color-primary)]/10 to-transparent p-3 rounded-lg border border-[var(--color-primary)]/10">
                    <span className="material-symbols-outlined text-[var(--color-primary)] text-2xl">face</span>
                    <div className="flex flex-col">
                      <span className="text-xs text-[var(--color-text-secondary)] font-medium uppercase tracking-wide">
                        Member Recognized
                      </span>
                      <span className="text-sm font-bold text-[var(--color-primary)]">
                        Welcome back, {user.name}!
                      </span>
                    </div>
                  </div>
                )}

                {/* Order Summary */}
                <div>
                  <h2 className="text-xl font-bold mb-4 text-[var(--color-text)]">Order Summary</h2>
                  <div className="flex flex-col gap-3 text-sm">
                    <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                      <span>Subtotal</span>
                      <span className="font-medium text-[var(--color-text)]">₹{subtotal.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between items-center text-[var(--color-success)]">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified</span>
                          Discount
                        </span>
                        <span className="font-medium">-₹{discount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-dashed border-[var(--color-border)] my-4" />
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-base font-semibold text-[var(--color-text)]">Total</span>
                    <span className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
                      ₹{total.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <span className="text-xs text-[var(--color-text-muted)]">Including taxes</span>
                  </div>
                </div>

                {/* Loyalty Points Highlight */}
                <div className="bg-[var(--color-gold-bg)] rounded-lg p-4 flex items-center justify-between border border-[var(--color-gold)]/20">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">You will earn</span>
                    <span className="font-bold text-[var(--color-gold)] text-lg flex items-center gap-1">
                      {formatPoints(totalPoints)} Points
                    </span>
                  </div>
                  <div className="size-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined">loyalty</span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-3 mt-2">
                  <Link
                    href="/checkout"
                    className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-3.5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
                  >
                    Proceed to Checkout
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform" style={{ fontSize: '20px' }}>
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    href="/products"
                    className="w-full bg-transparent hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] font-semibold py-3 rounded-lg transition-colors text-sm text-center"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>

              {/* Security Badge */}
              <div className="mt-6 flex justify-center gap-4 opacity-50 hover:opacity-100 transition-all duration-500">
                <div className="h-6 flex items-center gap-1 text-xs font-medium text-[var(--color-text-muted)]">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock</span>
                  Secure Checkout
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
