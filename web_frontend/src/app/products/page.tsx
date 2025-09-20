'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getProducts } from '@/lib/api';
import { Pagination } from '@/types';
import { useProductStore } from '@/stores';
import { useAuth } from '@/context/AuthContext';
import { normalizeProducts, NormalizedProduct } from '@/lib/normalizers';
import { ProductCard } from '@/components/products/ProductCard';

function LoadingSkeleton() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Hero Skeleton */}
      <div className="relative w-full h-[320px] skeleton" />
      {/* Filters Skeleton */}
      <div className="sticky top-20 z-40 bg-[var(--color-bg)]/95 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-4">
          <div className="flex gap-3 mb-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 w-24 skeleton rounded-full" />
            ))}
          </div>
          <div className="flex gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-6 w-20 skeleton rounded" />
            ))}
          </div>
        </div>
      </div>
      {/* Products Grid Skeleton */}
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-white">
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
    </div>
  );
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const { categories, fetchCategories, isLoadingCategories } = useProductStore();
  const { user } = useAuth();

  const [products, setProducts] = useState<NormalizedProduct[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // User's hideNonVeg preference
  const userHideNonVeg = user?.hideNonVeg ?? false;

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [vegOnly, setVegOnly] = useState(userHideNonVeg);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Sync vegOnly with user preference when it changes
  useEffect(() => {
    if (userHideNonVeg) {
      setVegOnly(true);
    }
  }, [userHideNonVeg]);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const fetchProductsData = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    const result = await getProducts({
      search: search || undefined,
      category: selectedCategory || undefined,
      isVeg: vegOnly ? true : undefined,
      featured: featuredOnly ? true : undefined,
      page: isLoadMore ? page : 1,
      limit: 12,
    });

    if (result.success && result.data) {
      const normalizedProducts = normalizeProducts(result.data);

      // Filter on-sale products client-side if needed
      let filteredProducts = normalizedProducts;
      if (onSaleOnly) {
        filteredProducts = normalizedProducts.filter(p => p.hasActiveDiscount);
      }

      if (isLoadMore) {
        setProducts(prev => [...prev, ...filteredProducts]);
      } else {
        setProducts(filteredProducts);
      }

      if (result.pagination) {
        setPagination(result.pagination);
      }
    }

    setLoading(false);
    setLoadingMore(false);
  }, [search, selectedCategory, vegOnly, featuredOnly, onSaleOnly, page]);

  useEffect(() => {
    setPage(1);
    fetchProductsData();
  }, [search, selectedCategory, vegOnly, featuredOnly, onSaleOnly]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProductsData();
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProductsData(true);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setVegOnly(false);
    setFeaturedOnly(false);
    setOnSaleOnly(false);
    setPage(1);
  };

  const hasActiveFilters = search || selectedCategory || vegOnly || featuredOnly || onSaleOnly;

  if (loading && products.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Hero Section */}
      <div className="relative w-full">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1920")',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/80" />
        </div>
        <div className="relative mx-auto flex max-w-[960px] flex-col items-center px-4 py-16 lg:py-20 text-center">
          <h1 className="mb-4 text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl">
            Our Menu
          </h1>
          <p className="mb-8 max-w-2xl text-base text-gray-200 md:text-lg">
            Freshly brewed artisan coffee and handcrafted pastries, curated just for you.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative w-full max-w-lg">
            <div className="relative flex items-center h-14 w-full overflow-hidden rounded-full bg-white shadow-lg focus-within:ring-2 focus-within:ring-[var(--color-primary)]/50 transition-all">
              <div className="flex h-full items-center pl-5 text-gray-400">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="peer h-full w-full border-none bg-transparent px-4 text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0"
                placeholder="Find your craving..."
              />
              <button
                type="submit"
                className="m-1.5 h-11 rounded-full bg-[var(--color-primary)] px-6 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Filter Section - Sticky */}
      <div className="sticky top-20 z-40 border-b border-stone-200 bg-[var(--color-bg)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          {/* Categories */}
          <div className="flex items-center justify-between gap-4">
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory('')}
                className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-all ${
                  !selectedCategory
                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                    : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                }`}
              >
                All Items
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id === selectedCategory ? '' : cat.id)}
                  className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-[var(--color-primary)] text-white shadow-md'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="shrink-0 text-sm font-medium text-stone-500 hover:text-[var(--color-primary)] transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                Clear
              </button>
            )}
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-stone-200/50 pt-3">
            {/* Veg Only Toggle */}
            <label className={`group flex items-center gap-2 ${userHideNonVeg ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={vegOnly || userHideNonVeg}
                  onChange={(e) => !userHideNonVeg && setVegOnly(e.target.checked)}
                  disabled={userHideNonVeg}
                  className="peer sr-only"
                />
                <div className={`h-5 w-9 rounded-full bg-stone-300 peer-checked:bg-[var(--color-primary)] after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-focus:outline-none transition-colors ${userHideNonVeg ? 'opacity-70' : ''}`} />
              </div>
              <span className={`text-sm font-medium transition-colors ${userHideNonVeg ? 'text-stone-500' : 'text-stone-700 group-hover:text-[var(--color-primary)]'}`}>
                Veg Only
                {userHideNonVeg && (
                  <span className="ml-1 text-xs text-stone-400">(profile setting)</span>
                )}
              </span>
            </label>

            {/* Featured Toggle */}
            <label className="group flex cursor-pointer items-center gap-2">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={featuredOnly}
                  onChange={(e) => setFeaturedOnly(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-stone-300 peer-checked:bg-[var(--color-primary)] after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-focus:outline-none transition-colors" />
              </div>
              <span className="text-sm font-medium text-stone-700 group-hover:text-[var(--color-primary)] transition-colors">
                Featured
              </span>
            </label>

            {/* On Sale Toggle */}
            <label className="group flex cursor-pointer items-center gap-2">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={onSaleOnly}
                  onChange={(e) => setOnSaleOnly(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-stone-300 peer-checked:bg-[var(--color-primary)] after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-focus:outline-none transition-colors" />
              </div>
              <span className="text-sm font-medium text-stone-700 group-hover:text-[var(--color-primary)] transition-colors">
                On Sale
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Results Info */}
        {!loading && products.length > 0 && (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-stone-500">
              Showing {products.length} {products.length === 1 ? 'item' : 'items'}
              {pagination && pagination.total > products.length && ` of ${pagination.total}`}
            </p>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && products.length > 0 && (
          <div className="mb-6 flex items-center gap-2 text-stone-500">
            <div className="size-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </div>
        )}

        {/* Products Grid */}
        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <Link key={product.id} href={`/products/${product.slug}`}>
                  <ProductCard product={product} />
                </Link>
              ))}
            </div>

            {/* Load More Button */}
            {pagination && pagination.hasNext && (
              <div className="mt-12 flex justify-center pb-10">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="group flex items-center gap-2 rounded-full border border-stone-200 bg-white px-8 py-3 text-sm font-bold text-stone-700 transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <div className="size-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <span>Load More Products</span>
                      <span className="material-symbols-outlined transition-transform group-hover:translate-y-0.5">expand_more</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : !loading ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-stone-400" style={{ fontSize: '48px' }}>
                search_off
              </span>
            </div>
            <h3 className="text-2xl font-bold text-stone-900 mb-3">No products found</h3>
            <p className="text-stone-500 mb-6">Try adjusting your search or filters.</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 text-[var(--color-primary)] font-medium hover:underline"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                Clear all filters
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
