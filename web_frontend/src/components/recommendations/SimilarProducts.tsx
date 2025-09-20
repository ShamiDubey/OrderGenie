'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRecommendationStore } from '@/stores/recommendationStore';
import { useCartStore } from '@/stores';
import { NormalizedRecommendationProduct } from '@/lib/normalizers';

interface SimilarProductsProps {
  productId: string;
  limit?: number;
}

function SimilarCard({ product }: { product: NormalizedRecommendationProduct }) {
  const { addItem, getItemByProductId } = useCartStore();
  const cartItem = getItemByProductId(product.id);
  const cartQuantity = cartItem?.quantity || 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.isAvailable) return;

    const cartProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      discountedPrice: product.discountedPrice,
      discountEnds: product.discountEnds,
      isVeg: product.isVeg,
      tags: product.tags,
      imageUrl: product.imageUrl,
      thumbnailUrl: product.thumbnailUrl,
      categoryId: product.categoryId,
      category: product.categoryName ? { id: product.categoryId || '', name: product.categoryName, slug: product.categorySlug || '' } : null,
      isAvailable: product.isAvailable,
      isFeatured: product.isFeatured,
      displayOrder: 0,
      preparationTime: product.preparationTime,
      calories: product.calories,
      servingSize: product.servingSize,
      effectivePrice: product.effectivePrice,
      hasActiveDiscount: product.hasActiveDiscount,
      discountPercent: product.discountPercent,
      royaltyPoints: product.royaltyPoints || 50,
      createdAt: '',
      updatedAt: '',
    };
    addItem(cartProduct);
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className="min-w-[260px] md:min-w-[280px] snap-start bg-[var(--color-surface)] rounded-xl p-3 border border-[var(--color-border-light)] hover:border-[var(--color-primary)]/30 transition-all group cursor-pointer shadow-sm flex-shrink-0"
    >
      <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-4 bg-[var(--color-bg-tertiary)]">
        {product.thumbnailUrl || product.imageUrl ? (
          <Image
            src={product.thumbnailUrl || product.imageUrl!}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
            <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>image</span>
          </div>
        )}

        {/* Quick Add Button */}
        {product.isAvailable && (
          <button
            onClick={handleAddToCart}
            className={`absolute bottom-2 right-2 size-8 rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform ${
              cartQuantity > 0
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-white/90 dark:bg-black/60 text-[var(--color-primary)]'
            }`}
          >
            {cartQuantity > 0 ? (
              <span className="text-xs font-bold">{cartQuantity}</span>
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            )}
          </button>
        )}

        {/* Veg/Non-Veg Indicator */}
        <div className="absolute top-2 left-2">
          <div className={`food-indicator ${product.isVeg ? 'food-indicator-veg' : 'food-indicator-nonveg'}`} />
        </div>

        {/* Discount Badge */}
        {product.hasActiveDiscount && product.discountPercent > 0 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-[var(--color-error)]/90 backdrop-blur-sm rounded text-[10px] font-bold text-white uppercase tracking-wider">
            {product.discountPercent}% OFF
          </div>
        )}

        {!product.isAvailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold text-xs bg-black/50 px-2 py-1 rounded">Out of Stock</span>
          </div>
        )}
      </div>

      <div className="px-1">
        <h4 className="font-bold text-[var(--color-text)] mb-1 truncate">{product.name}</h4>
        {product.description && (
          <p className="text-xs text-[var(--color-text-muted)] mb-3 line-clamp-1">{product.description}</p>
        )}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--color-text)]">₹{product.effectivePrice.toFixed(0)}</span>
            {product.hasActiveDiscount && product.discountedPrice !== null && (
              <span className="text-xs text-[var(--color-text-muted)] line-through">
                ₹{product.price.toFixed(0)}
              </span>
            )}
          </div>
          {product.calories && (
            <span className="text-xs font-medium text-[var(--color-text-muted)]">{product.calories} Kcal</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function SimilarProducts({ productId, limit = 5 }: SimilarProductsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const {
    fetchSimilar,
    getSimilarForProduct,
    isLoadingSimilar,
    similarError,
  } = useRecommendationStore();

  const similarProducts = getSimilarForProduct(productId);
  const isLoading = isLoadingSimilar.get(productId) || false;
  const error = similarError.get(productId);

  useEffect(() => {
    if (productId) {
      fetchSimilar(productId, limit);
    }
  }, [productId, limit, fetchSimilar]);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      el?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [similarProducts]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mt-24 mb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-56 skeleton rounded" />
          <div className="flex gap-2">
            <div className="size-10 skeleton rounded-full" />
            <div className="size-10 skeleton rounded-full" />
          </div>
        </div>
        <div className="flex gap-6 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="min-w-[280px] rounded-xl overflow-hidden flex-shrink-0">
              <div className="aspect-[4/3] skeleton" />
              <div className="p-3 space-y-2">
                <div className="h-5 w-32 skeleton" />
                <div className="h-4 w-full skeleton" />
                <div className="h-4 w-24 skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || similarProducts.length === 0) {
    return null;
  }

  return (
    <div className="mt-24 mb-12">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold text-[var(--color-text)]">You might also like</h3>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`size-10 rounded-full border border-[var(--color-border)] flex items-center justify-center transition-colors ${
              canScrollLeft
                ? 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text)]'
                : 'opacity-40 cursor-not-allowed text-[var(--color-text-muted)]'
            }`}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`size-10 rounded-full border border-[var(--color-border)] flex items-center justify-center transition-colors ${
              canScrollRight
                ? 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text)]'
                : 'opacity-40 cursor-not-allowed text-[var(--color-text-muted)]'
            }`}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto pb-8 snap-x no-scrollbar -mx-4 px-4 md:-mx-0 md:px-0"
      >
        {similarProducts.map((product) => (
          <SimilarCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
