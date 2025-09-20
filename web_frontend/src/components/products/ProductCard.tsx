'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { NormalizedProduct } from '@/lib/normalizers';
import { useCartStore } from '@/stores';

interface ProductCardProps {
  product: NormalizedProduct;
  onClick?: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const { addItem, getItemByProductId, updateQuantity, removeItem } = useCartStore();
  const [isAdding, setIsAdding] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const cartItem = getItemByProductId(product.id);
  const cartQuantity = cartItem?.quantity || 0;
  const isInCart = cartQuantity > 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!product.isAvailable) return;
    setIsAdding(true);
    addItem(product);
    setTimeout(() => setIsAdding(false), 600);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    addItem(product);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (cartQuantity > 1) {
      updateQuantity(product.id, cartQuantity - 1);
    } else {
      removeItem(product.id);
    }
  };

  // Get badge info based on tags/featured status
  const getBadge = () => {
    if (product.isFeatured) {
      return { label: 'Bestseller', bg: 'bg-amber-400/90', text: 'text-amber-950' };
    }
    if (product.tags?.includes('seasonal')) {
      return { label: 'Seasonal', bg: 'bg-orange-500/90', text: 'text-white' };
    }
    if (product.tags?.includes('new')) {
      return { label: 'New Arrival', bg: 'bg-sky-500/90', text: 'text-white' };
    }
    return null;
  };

  const badge = getBadge();

  // Sold out state
  if (!product.isAvailable) {
    return (
      <article className="group relative flex w-full flex-col overflow-hidden rounded-2xl bg-stone-50 opacity-80 shadow-none border border-stone-200">
        {/* Image Section */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
          {/* Sold Out Overlay */}
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
            <span className="rounded-lg bg-stone-900/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur-sm">
              Sold Out
            </span>
          </div>

          {/* Loading Skeleton */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-stone-200 animate-pulse" />
          )}

          {/* Product Image */}
          {product.thumbnailUrl || product.imageUrl ? (
            <Image
              src={product.thumbnailUrl || product.imageUrl!}
              alt={product.name}
              fill
              className={`object-cover grayscale transition-transform duration-700 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-stone-300">
              <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>image</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex flex-1 flex-col p-4 opacity-75">
          {/* Category Row */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Veg/Non-veg Badge */}
              {product.isVeg ? (
                <div className="flex items-center justify-center w-3.5 h-3.5 border-[1.5px] border-green-600 rounded-[3px]" title="Vegetarian">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-3.5 h-3.5 border-[1.5px] border-red-600 rounded-[3px]" title="Non-Vegetarian">
                  <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-red-600" />
                </div>
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                {product.category?.name || 'Uncategorized'}
              </span>
            </div>
          </div>

          {/* Product Name */}
          <h3 className="mb-1 text-base font-bold text-stone-500 line-clamp-1">
            {product.name}
          </h3>

          {/* Description */}
          <p className="mb-3 text-xs leading-relaxed text-stone-400 line-clamp-2 min-h-[32px]">
            {product.description || 'Delicious and freshly prepared just for you.'}
          </p>

          {/* Points Badge */}
          <div className="mb-3 opacity-50">
            <div className="inline-flex items-center gap-1 rounded-md bg-stone-200 px-2 py-1 text-[10px] font-bold text-stone-500">
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>stars</span>
              Earn {product.royaltyPoints || 0} pts
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-end justify-between gap-2 border-t border-stone-200 pt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-stone-500">₹{product.effectivePrice.toFixed(0)}</span>
            </div>
            <button
              className="flex h-9 items-center justify-center rounded-xl bg-stone-200 px-3 text-xs font-bold text-stone-400 cursor-not-allowed"
              disabled
            >
              Notify Me
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group relative flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg ${
        isInCart
          ? 'ring-2 ring-[var(--color-primary)]/20 shadow-md'
          : 'ring-1 ring-stone-200 hover:ring-stone-300'
      }`}
      onClick={onClick}
    >
      {/* Image Section */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
        {/* Discount Badge - Top Left */}
        {product.hasActiveDiscount && product.discountPercent > 0 && (
          <div className="absolute left-3 top-3 z-10 flex items-center justify-center rounded-lg bg-red-500/95 px-2.5 py-1 shadow-sm backdrop-blur-[2px]">
            <span className="text-[10px] font-bold uppercase tracking-wide text-white">
              {product.discountPercent}% OFF
            </span>
          </div>
        )}

        {/* Wishlist Button - Top Right */}
        <button
          onClick={(e) => e.preventDefault()}
          className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-white/90 text-stone-400 shadow-sm backdrop-blur-sm transition-all hover:bg-red-50 hover:text-red-500 hover:scale-110"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>favorite</span>
        </button>

        {/* Badge - Bottom Left */}
        {badge && (
          <div className="absolute bottom-3 left-3 z-10">
            <span className={`inline-block rounded-md ${badge.bg} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.text} shadow-sm backdrop-blur-sm`}>
              {badge.label}
            </span>
          </div>
        )}

        {/* Loading Skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-stone-200 animate-pulse" />
        )}

        {/* Product Image */}
        {product.thumbnailUrl || product.imageUrl ? (
          <Image
            src={product.thumbnailUrl || product.imageUrl!}
            alt={product.name}
            fill
            className={`object-cover transition-transform duration-700 will-change-transform group-hover:scale-110 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-stone-300">
            <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>image</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category & Prep Time Row */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Veg/Non-veg Badge */}
            {product.isVeg ? (
              <div className="flex items-center justify-center w-3.5 h-3.5 border-[1.5px] border-green-600 rounded-[3px]" title="Vegetarian">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-3.5 h-3.5 border-[1.5px] border-red-600 rounded-[3px]" title="Non-Vegetarian">
                <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-red-600" />
              </div>
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              {product.category?.name || 'Uncategorized'}
            </span>
          </div>
          {product.preparationTime && (
            <div className="flex items-center gap-1 text-stone-400" title="Preparation Time">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
              <span className="text-[10px] font-medium">{product.preparationTime} min</span>
            </div>
          )}
        </div>

        {/* Product Name */}
        <h3 className="mb-1 text-base font-bold text-stone-900 line-clamp-1 group-hover:text-[var(--color-primary)] transition-colors">
          {product.name}
        </h3>

        {/* Description */}
        <p className="mb-3 text-xs leading-relaxed text-stone-500 line-clamp-2 min-h-[32px]">
          {product.description || 'Delicious and freshly prepared just for you.'}
        </p>

        {/* Points Badge */}
        <div className="mb-3">
          <div className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-600">
            <span className="material-symbols-outlined text-[var(--color-primary)]" style={{ fontSize: '12px' }}>stars</span>
            Earn {product.royaltyPoints || 0} pts
          </div>
        </div>

        {/* Footer: Price & Actions */}
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-stone-100 pt-3">
          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-stone-900">
              ₹{product.effectivePrice.toFixed(0)}
            </span>
            {product.hasActiveDiscount && product.discountedPrice !== null && (
              <>
                <span className="text-[11px] font-medium text-stone-400 line-through decoration-stone-400/50">
                  ₹{product.price.toFixed(0)}
                </span>
                <span className="text-[11px] font-bold text-red-500">
                  {product.discountPercent}% off
                </span>
              </>
            )}
          </div>

          {/* Action Button */}
          {isAdding ? (
            /* Loading State */
            <button
              className="flex h-9 w-20 items-center justify-center rounded-xl bg-[var(--color-primary)]/80 text-white shadow-none cursor-wait"
              disabled
            >
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
              </svg>
            </button>
          ) : isInCart ? (
            /* Quantity Selector */
            <div className="flex h-9 items-center rounded-xl bg-stone-100 p-1">
              <button
                onClick={handleDecrement}
                className="flex h-full w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-white hover:text-[var(--color-primary)] hover:shadow-sm transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>remove</span>
              </button>
              <span className="flex w-6 items-center justify-center text-sm font-bold text-stone-900">
                {cartQuantity}
              </span>
              <button
                onClick={handleIncrement}
                className="flex h-full w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-white hover:text-[var(--color-primary)] hover:shadow-sm transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              </button>
            </div>
          ) : (
            /* Add Button */
            <button
              onClick={handleAddToCart}
              className="relative flex h-9 items-center gap-1.5 overflow-hidden rounded-xl bg-[var(--color-primary)] px-4 text-xs font-bold uppercase tracking-wide text-white shadow-md transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-lg active:scale-95"
            >
              Add
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add_shopping_cart</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
