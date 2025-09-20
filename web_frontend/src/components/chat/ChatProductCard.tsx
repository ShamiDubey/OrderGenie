'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import { ChatProduct } from '@/stores/chatStore';

interface ChatProductCardProps {
  product: ChatProduct;
  isSelected: boolean;
  onSelect: () => void;
}

export function ChatProductCard({ product, isSelected, onSelect }: ChatProductCardProps) {
  const hasDiscount = product.has_active_discount && product.discount_percent > 0;

  return (
    <div
      onClick={onSelect}
      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-2 transition-all ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-gray-100 bg-white hover:border-gray-200'
      }`}
    >
      {/* Checkbox */}
      <div
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          isSelected
            ? 'border-primary bg-primary'
            : 'border-gray-300 bg-white'
        }`}
      >
        {isSelected && <Check className="h-3 w-3 text-white" />}
      </div>

      {/* Image */}
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {product.thumbnail_url || product.image_url ? (
          <Image
            src={product.thumbnail_url || product.image_url || ''}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <span className="text-xl">🍽️</span>
          </div>
        )}
        {/* Veg/Non-veg indicator */}
        <div
          className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-sm border ${
            product.is_veg
              ? 'border-green-600 bg-green-500'
              : 'border-red-600 bg-red-500'
          }`}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-medium text-gray-900">
          {product.name}
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary">
            ₹{product.effective_price}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xs text-gray-400 line-through">
                ₹{product.price}
              </span>
              <span className="rounded bg-green-100 px-1 py-0.5 text-[10px] font-medium text-green-700">
                {product.discount_percent}% OFF
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
