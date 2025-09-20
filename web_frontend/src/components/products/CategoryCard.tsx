'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Category } from '@/types';
import { NormalizedCategory } from '@/lib/normalizers';

interface CategoryCardProps {
  category: Category | NormalizedCategory;
  onClick?: () => void;
  variant?: 'circle' | 'card';
}

export function CategoryCard({ category, onClick, variant = 'card' }: CategoryCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Support both Category and NormalizedCategory types
  const productCount = 'productCount' in category
    ? category.productCount
    : category._count?.products;

  // Circular variant - used on home page
  if (variant === 'circle') {
    return (
      <div
        className="group flex flex-col items-center gap-3 cursor-pointer"
        onClick={onClick}
      >
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-transparent group-hover:border-[var(--color-primary)]/20 transition-all shadow-sm">
          {!imageLoaded && (
            <div className="w-full h-full skeleton rounded-full" />
          )}
          {category.imageUrl ? (
            <Image
              src={category.imageUrl}
              alt={category.name}
              width={128}
              height={128}
              className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="w-full h-full bg-[var(--color-bg-tertiary)] flex items-center justify-center text-[var(--color-text-muted)]">
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>category</span>
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
            {category.name}
          </p>
          {productCount !== undefined && productCount > 0 && (
            <p className="text-xs text-[var(--color-text-muted)]">
              {productCount} item{productCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Card variant - used on categories page
  return (
    <div
      className="group bg-[var(--color-surface)] rounded-xl overflow-hidden shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-soft-hover)] transition-all duration-300 cursor-pointer hover:-translate-y-1"
      onClick={onClick}
    >
      <div className="relative h-40 bg-[var(--color-bg-tertiary)] overflow-hidden">
        {!imageLoaded && (
          <div className="absolute inset-0 skeleton" />
        )}
        {category.imageUrl ? (
          <Image
            src={category.imageUrl}
            alt={category.name}
            fill
            className={`object-cover group-hover:scale-110 transition-transform duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
            <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>category</span>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="p-4">
        <h3 className="font-bold text-[var(--color-text)] text-lg mb-1 group-hover:text-[var(--color-primary)] transition-colors">
          {category.name}
        </h3>
        {category.description && (
          <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-2">
            {category.description}
          </p>
        )}
        {productCount !== undefined && productCount > 0 && (
          <div className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>restaurant_menu</span>
            {productCount} item{productCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
