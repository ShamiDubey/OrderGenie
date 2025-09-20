'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRecommendationStore } from '@/stores/recommendationStore';
import { useAuth } from '@/context/AuthContext';
import { ProductCard } from '@/components/products/ProductCard';
import { NormalizedRecommendation, NormalizedRecommendationProduct, NormalizedProduct } from '@/lib/normalizers';

interface RecommendedForYouProps {
  profileId: string;
  context?: string;
  limit?: number;
}

// Convert NormalizedRecommendationProduct to NormalizedProduct for ProductCard
function toNormalizedProduct(product: NormalizedRecommendationProduct): NormalizedProduct {
  return {
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
    category: product.categoryName
      ? { id: product.categoryId || '', name: product.categoryName, slug: product.categorySlug || '' }
      : null,
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
}

export function RecommendedForYou({ profileId, context = 'homepage', limit = 10 }: RecommendedForYouProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const { user } = useAuth();

  const {
    personalizedRecommendations,
    personalizedInsights,
    isLoadingPersonalized,
    personalizedError,
    fetchPersonalized,
  } = useRecommendationStore();

  // Filter recommendations based on user's hideNonVeg preference
  const filteredRecommendations = useMemo(() => {
    if (user?.hideNonVeg) {
      return personalizedRecommendations.filter(rec => rec.product.isVeg);
    }
    return personalizedRecommendations;
  }, [personalizedRecommendations, user?.hideNonVeg]);

  useEffect(() => {
    if (profileId) {
      fetchPersonalized(profileId, context, limit);
    }
  }, [profileId, context, limit, fetchPersonalized]);

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
  }, [filteredRecommendations]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (isLoadingPersonalized) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-56 skeleton rounded" />
          <div className="flex gap-2">
            <div className="size-10 skeleton rounded-full" />
            <div className="size-10 skeleton rounded-full" />
          </div>
        </div>
        <div className="flex gap-6 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="min-w-[280px] rounded-2xl overflow-hidden flex-shrink-0 bg-white">
              <div className="aspect-[4/3] skeleton" />
              <div className="p-4 space-y-3">
                <div className="flex justify-between">
                  <div className="h-3.5 w-16 skeleton rounded" />
                  <div className="h-3.5 w-12 skeleton rounded" />
                </div>
                <div className="h-5 w-32 skeleton rounded" />
                <div className="h-8 w-full skeleton rounded" />
                <div className="h-6 w-20 skeleton rounded" />
                <div className="flex justify-between pt-3 border-t border-stone-100">
                  <div className="h-6 w-16 skeleton rounded" />
                  <div className="h-9 w-20 skeleton rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (personalizedError || filteredRecommendations.length === 0) {
    return null;
  }

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[var(--color-primary)]">auto_awesome</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text)]">Recommended For You</h2>
            {personalizedInsights && (
              <p className="text-sm text-[var(--color-text-muted)]">{personalizedInsights}</p>
            )}
          </div>
        </div>
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
        className="flex gap-6 overflow-x-auto pb-4 snap-x no-scrollbar -mx-4 px-4 md:-mx-0 md:px-0"
      >
        {filteredRecommendations.map((rec) => (
          <div key={rec.product.id} className="min-w-[280px] max-w-[280px] snap-start flex-shrink-0">
            <Link href={`/products/${rec.product.slug}`}>
              <ProductCard product={toNormalizedProduct(rec.product)} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
