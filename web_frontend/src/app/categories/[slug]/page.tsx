'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCategoryBySlug, getCategoryProductsBySlug } from '@/lib/api';
import { Category } from '@/types';
import { ProductCard } from '@/components/products/ProductCard';
import { normalizeProducts, NormalizedProduct } from '@/lib/normalizers';

function LoadingSkeleton() {
  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Skeleton */}
        <div className="mb-6">
          <div className="h-5 w-48 skeleton rounded" />
        </div>

        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-10 w-64 skeleton rounded mb-2" />
          <div className="h-5 w-96 skeleton rounded" />
        </div>

        {/* Products Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden">
              <div className="aspect-[4/3] skeleton" />
              <div className="p-5 space-y-3">
                <div className="h-4 w-20 skeleton" />
                <div className="h-5 w-32 skeleton" />
                <div className="h-4 w-full skeleton" />
                <div className="h-10 skeleton" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<NormalizedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!params.slug) return;

      setLoading(true);
      const [categoryRes, productsRes] = await Promise.all([
        getCategoryBySlug(params.slug as string),
        getCategoryProductsBySlug(params.slug as string),
      ]);

      if (categoryRes.success && categoryRes.data) {
        setCategory(categoryRes.data);
      } else {
        setError(categoryRes.error || 'Category not found');
      }

      if (productsRes.success && productsRes.data) {
        const normalizedProducts = normalizeProducts(productsRes.data);
        setProducts(normalizedProducts);
      }

      setLoading(false);
    }

    fetchData();
  }, [params.slug]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !category) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-[var(--color-bg-tertiary)] rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-[var(--color-text-muted)]" style={{ fontSize: '40px' }}>
              error_outline
            </span>
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">{error || 'Category not found'}</h2>
          <p className="text-[var(--color-text-secondary)] mb-6">The category you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-[var(--color-primary)] font-medium hover:underline"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            Go Back
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/categories" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
              Categories
            </Link>
            <span className="text-[var(--color-border)]">/</span>
            <span className="text-[var(--color-text)] font-medium">{category.name}</span>
          </div>
        </nav>

        {/* Category Header */}
        <div className="mb-10">
          <div className="flex items-start gap-6">
            {category.imageUrl && (
              <div className="hidden sm:block w-24 h-24 rounded-xl overflow-hidden bg-[var(--color-bg-tertiary)] shrink-0">
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text)] mb-2">{category.name}</h1>
              {category.description && (
                <p className="text-[var(--color-text-secondary)] text-lg">{category.description}</p>
              )}
              <p className="text-sm text-[var(--color-text-muted)] mt-2">
                {products.length} item{products.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link key={product.id} href={`/products/${product.slug}`}>
                <ProductCard product={product} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-[var(--color-bg-tertiary)] rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-[var(--color-text-muted)]" style={{ fontSize: '40px' }}>
                inventory_2
              </span>
            </div>
            <h3 className="text-xl font-bold text-[var(--color-text)] mb-2">No products yet</h3>
            <p className="text-[var(--color-text-secondary)] mb-6">Check back soon for new items in this category.</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-[var(--color-primary)] font-medium hover:underline"
            >
              Browse all products
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
