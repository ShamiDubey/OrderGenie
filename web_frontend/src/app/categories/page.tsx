'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCategories } from '@/lib/api';
import { Category } from '@/types';

function LoadingSkeleton() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <main className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div>
            <div className="h-10 w-64 skeleton rounded mb-3" />
            <div className="h-5 w-96 skeleton rounded" />
          </div>
          <div className="h-12 w-72 skeleton rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[4/3] skeleton rounded-2xl" />
          ))}
        </div>
      </main>
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchCategories() {
      setLoading(true);
      const result = await getCategories();
      if (result.success && result.data) {
        setCategories(result.data);
      }
      setLoading(false);
    }
    fetchCategories();
  }, []);

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <main className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--color-text)] mb-2">
              Menu Categories
            </h1>
            <p className="text-[var(--color-text-secondary)] max-w-lg">
              Explore our curated selection of artisan blends and fresh delights.
            </p>
          </div>

          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" style={{ fontSize: '20px' }}>
                search
              </span>
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-11 pr-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all"
              />
            </div>
            <button className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>filter_list</span>
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        {filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer"
              >
                {/* Background Image */}
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[var(--color-primary)]/30" style={{ fontSize: '80px' }}>
                      restaurant_menu
                    </span>
                  </div>
                )}

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Badge - if category has many items */}
                {category._count?.products && category._count.products > 10 && (
                  <div className="absolute left-4 top-4 px-3 py-1 rounded-full bg-[var(--color-success)]/90 backdrop-blur-sm text-xs font-bold text-white">
                    Popular
                  </div>
                )}

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-1 group-hover:text-[var(--color-primary-light)] transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-sm text-white/70">
                    {category._count?.products || 0} Selections
                  </p>
                </div>

                {/* Hover Arrow */}
                <div className="absolute bottom-5 right-5 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  <span className="material-symbols-outlined text-white" style={{ fontSize: '20px' }}>
                    arrow_forward
                  </span>
                </div>
              </Link>
            ))}

            {/* "View All" Card - No image variant */}
            <Link
              href="/products"
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-primary)]/5 flex flex-col items-center justify-center transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary)]/20 transition-colors">
                <span className="material-symbols-outlined text-[var(--color-primary)]" style={{ fontSize: '32px' }}>
                  restaurant_menu
                </span>
              </div>
              <h3 className="text-xl font-bold text-[var(--color-primary)] mb-1">
                View All Items
              </h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Browse our full menu
              </p>
              <div className="absolute bottom-5 right-5 w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[var(--color-primary)] group-hover:translate-x-1 transition-transform" style={{ fontSize: '20px' }}>
                  arrow_forward
                </span>
              </div>
            </Link>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-[var(--color-bg-tertiary)] rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-[var(--color-text-muted)]" style={{ fontSize: '48px' }}>
                {searchQuery ? 'search_off' : 'category'}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-3">
              {searchQuery ? 'No categories found' : 'No categories yet'}
            </h3>
            <p className="text-[var(--color-text-secondary)] mb-6">
              {searchQuery
                ? `We couldn't find any categories matching "${searchQuery}"`
                : 'Check back soon for our menu categories.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-2 text-[var(--color-primary)] font-medium hover:underline"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                Clear search
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
