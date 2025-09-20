'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getFeaturedProducts } from '@/lib/api';
import { ProductCard } from '@/components/products/ProductCard';
import { CategoryCard } from '@/components/products/CategoryCard';
import { RecommendedForYou, TrendingProducts } from '@/components/recommendations';
import { useProductStore } from '@/stores';
import { useAuth } from '@/context/AuthContext';
import { normalizeProducts, NormalizedProduct } from '@/lib/normalizers';

function LoadingSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Hero Skeleton */}
      <div className="h-[500px] skeleton mb-12" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Categories Skeleton */}
        <div className="mb-12">
          <div className="h-8 w-48 skeleton mb-6" />
          <div className="flex gap-8 overflow-x-auto no-scrollbar pb-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <div className="w-28 h-28 skeleton rounded-full" />
                <div className="h-4 w-20 skeleton" />
              </div>
            ))}
          </div>
        </div>

        {/* Products Skeleton */}
        <div className="mb-12">
          <div className="h-8 w-56 skeleton mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="h-48 skeleton" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-20 skeleton" />
                  <div className="h-5 w-32 skeleton" />
                  <div className="h-4 w-full skeleton" />
                  <div className="h-10 skeleton" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { categories, fetchCategories, isLoadingCategories } = useProductStore();
  const { user, isAuthenticated } = useAuth();
  const [featuredProducts, setFeaturedProducts] = useState<NormalizedProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    async function fetchFeaturedProducts() {
      setLoadingProducts(true);
      const result = await getFeaturedProducts(8);

      if (result.success && result.data) {
        const normalizedProducts = normalizeProducts(result.data);
        setFeaturedProducts(normalizedProducts);
      }
      setLoadingProducts(false);
    }

    fetchFeaturedProducts();
  }, []);

  // Filter products based on user's hideNonVeg preference
  const filteredFeaturedProducts = user?.hideNonVeg
    ? featuredProducts.filter((product) => product.isVeg)
    : featuredProducts;

  const loading = loadingProducts || isLoadingCategories;

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[500px] w-full flex items-center justify-center overflow-hidden bg-[var(--color-bg-tertiary)]">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2070"
            alt="Coffee shop ambiance"
            fill
            className="object-cover opacity-60"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)]/90 via-[var(--color-bg)]/40 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto space-y-6">
          <span className="inline-block py-1 px-3 rounded-full bg-[var(--color-primary)]/20 backdrop-blur-sm border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-xs font-bold tracking-wider uppercase">
            Premium Roasts
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-[var(--color-text)] tracking-tight leading-tight">
            Start your day with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-caramel)] to-[var(--color-primary)]">
              Perfection
            </span>
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto">
            Experience the finest artisan coffee, sourced ethically and roasted to bring out the unique notes of every bean.
          </p>
          <div className="pt-4 flex justify-center gap-4 flex-wrap">
            <Link
              href="/products"
              className="h-12 px-8 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg font-medium transition-all shadow-lg shadow-[var(--color-primary)]/30 flex items-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>restaurant_menu</span>
              Order Now
            </Link>
            <Link
              href="/login"
              className="h-12 px-8 bg-[var(--color-surface)]/80 hover:bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-lg font-medium transition-all backdrop-blur-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>face</span>
              Face Login
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Categories Section */}
        {categories.length > 0 && (
          <section className="mb-16">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-text)]">
                  Browse by Category
                </h2>
                <p className="text-[var(--color-text-secondary)] mt-1">
                  Find exactly what you're craving
                </p>
              </div>
              <Link
                href="/categories"
                className="hidden sm:flex items-center gap-1 text-[var(--color-primary)] font-medium hover:underline"
              >
                View All
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
              </Link>
            </div>

            <div className="flex gap-8 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4">
              {categories.slice(0, 6).map((category) => (
                <Link key={category.id} href={`/categories/${category.slug}`} className="shrink-0">
                  <CategoryCard category={category} variant="circle" />
                </Link>
              ))}
            </div>

            <Link
              href="/categories"
              className="sm:hidden flex items-center justify-center gap-1 mt-4 text-[var(--color-primary)] font-medium"
            >
              View All Categories
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
            </Link>
          </section>
        )}

        {/* Featured Products Section */}
        {filteredFeaturedProducts.length > 0 && (
          <section className="mb-16">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-text)]">
                  Morning Favorites
                </h2>
                <p className="text-[var(--color-text-secondary)] mt-1">
                  Start your day with our curated selection
                </p>
              </div>
              <Link
                href="/products?featured=true"
                className="hidden sm:flex items-center gap-1 text-[var(--color-primary)] font-medium hover:underline"
              >
                View All
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {filteredFeaturedProducts.slice(0, 4).map((product) => (
                <Link key={product.id} href={`/products/${product.slug}`}>
                  <ProductCard product={product} />
                </Link>
              ))}
            </div>

            <Link
              href="/products?featured=true"
              className="sm:hidden flex items-center justify-center gap-1 mt-6 text-[var(--color-primary)] font-medium"
            >
              View All Featured
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
            </Link>
          </section>
        )}

        {/* Recommendations Section */}
        <section className="mb-16">
          {isAuthenticated && user ? (
            <RecommendedForYou profileId={user.id} context="homepage" limit={10} />
          ) : (
            <TrendingProducts limit={10} />
          )}
        </section>

        {/* Empty State */}
        {categories.length === 0 && filteredFeaturedProducts.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--color-bg-tertiary)] mb-6">
              <span className="material-symbols-outlined text-[var(--color-text-muted)]" style={{ fontSize: '40px' }}>
                coffee
              </span>
            </div>
            <h3 className="text-xl font-bold text-[var(--color-text)] mb-2">
              Coming Soon
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              We're brewing up something special. Check back soon!
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-[var(--color-border-light)] bg-[var(--color-surface)] py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center justify-center size-8 rounded-full bg-[var(--color-primary-10)] text-[var(--color-primary)]">
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: '20px' }}>coffee</span>
            </div>
            <span className="font-bold text-[var(--color-text)]">Barista</span>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            &copy; 2024 Barista Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
