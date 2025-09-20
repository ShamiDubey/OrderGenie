'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { SimilarProducts } from '@/components/recommendations';
import { useCartStore, useProductStore } from '@/stores';
import { NormalizedProduct } from '@/lib/normalizers';
import { formatPoints } from '@/lib/utils';

function LoadingSkeleton() {
  return (
    <div className="min-h-screen">
      <main className="flex-grow w-full max-w-[1280px] mx-auto px-6 py-8 md:px-10 lg:px-20">
        <div className="mb-8">
          <div className="h-5 w-32 skeleton rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <div className="aspect-square lg:aspect-[4/3] skeleton rounded-2xl" />
          <div className="space-y-6">
            <div className="h-4 w-32 skeleton" />
            <div className="h-12 w-3/4 skeleton" />
            <div className="h-20 w-full skeleton" />
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 skeleton rounded-xl" />
              ))}
            </div>
            <div className="h-10 w-48 skeleton" />
            <div className="h-14 w-full skeleton rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchProductBySlug } = useProductStore();
  const { addItem, getItemByProductId, updateQuantity, isHydrated } = useCartStore();

  const [product, setProduct] = useState<NormalizedProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function loadProduct() {
      if (!params.slug) return;

      setLoading(true);
      const fetchedProduct = await fetchProductBySlug(params.slug as string);

      if (fetchedProduct) {
        setProduct(fetchedProduct);
      } else {
        setError('Product not found');
      }
      setLoading(false);
    }

    loadProduct();
  }, [params.slug, fetchProductBySlug]);

  // Sync quantity with cart when product is in cart
  useEffect(() => {
    if (isHydrated && product) {
      const cartItem = getItemByProductId(product.id);
      if (cartItem) {
        setQuantity(cartItem.quantity);
      }
    }
  }, [isHydrated, product, getItemByProductId]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow w-full max-w-[1280px] mx-auto px-6 py-16 text-center">
          <div className="w-20 h-20 bg-[var(--color-bg-tertiary)] rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-[var(--color-text-muted)]" style={{ fontSize: '40px' }}>
              error_outline
            </span>
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">{error || 'Product not found'}</h2>
          <p className="text-[var(--color-text-secondary)] mb-6">The product you're looking for doesn't exist or has been removed.</p>
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

  const cartItem = isHydrated ? getItemByProductId(product.id) : undefined;
  const isInCart = !!cartItem;

  const handleAddToCart = () => {
    if (isInCart) {
      updateQuantity(product.id, quantity);
    } else {
      // Add item with the selected quantity
      for (let i = 0; i < quantity; i++) {
        addItem(product);
      }
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return;
    setQuantity(newQuantity);
    if (isInCart) {
      updateQuantity(product.id, newQuantity);
    }
  };

  const totalPrice = product.effectivePrice * quantity;
  const totalPoints = (product.royaltyPoints || 50) * quantity;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow w-full max-w-[1280px] mx-auto px-6 py-8 md:px-10 lg:px-20">
        {/* Breadcrumb / Back Link */}
        <div className="mb-8">
          <Link
            href="/products"
            className="inline-flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors text-sm font-medium group"
          >
            <span className="material-symbols-outlined text-[18px] mr-1 group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            Back to Menu
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left Column: Image */}
          <div className="relative w-full aspect-square lg:aspect-[4/3] rounded-2xl overflow-hidden shadow-[var(--shadow-soft)] group bg-[var(--color-bg-tertiary)]">
            {/* Badges */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              {/* Veg/Non-Veg Badge with Symbol */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-sm rounded-full shadow-sm ${
                product.isVeg
                  ? 'bg-white/90 dark:bg-black/80'
                  : 'bg-white/90 dark:bg-black/80'
              }`}>
                <div className={`food-indicator ${product.isVeg ? 'food-indicator-veg' : 'food-indicator-nonveg'}`} />
                <span className={`text-xs font-semibold uppercase tracking-wide ${
                  product.isVeg
                    ? 'text-[var(--color-veg)]'
                    : 'text-[var(--color-nonveg)]'
                }`}>
                  {product.isVeg ? 'Veg' : 'Non-Veg'}
                </span>
              </div>

              {/* Featured Badge */}
              {product.isFeatured && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)]/90 backdrop-blur-sm rounded-full shadow-sm">
                  <span className="material-symbols-outlined text-amber-200" style={{ fontSize: '18px' }}>verified</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-white">Featured</span>
                </div>
              )}

              {/* Discount Badge */}
              {product.hasActiveDiscount && product.discountPercent > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-error)]/90 backdrop-blur-sm rounded-full shadow-sm">
                  <span className="material-symbols-outlined text-white" style={{ fontSize: '18px' }}>percent</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-white">{product.discountPercent}% OFF</span>
                </div>
              )}
            </div>

            {/* Product Image */}
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
                <span className="material-symbols-outlined" style={{ fontSize: '80px' }}>image</span>
              </div>
            )}

            {/* Out of Stock Overlay */}
            {!product.isAvailable && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">Out of Stock</span>
              </div>
            )}
          </div>

          {/* Right Column: Details */}
          <div className="flex flex-col h-full justify-center">
            {/* Category & Rating */}
            <div className="flex items-start justify-between mb-2">
              {product.category && (
                <Link
                  href={`/categories/${product.category.slug}`}
                  className="text-[var(--color-primary)] font-medium text-sm uppercase tracking-wider hover:underline"
                >
                  {product.category.name}
                </Link>
              )}
            </div>

            {/* Product Name */}
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-text)] mb-4 tracking-tight">
              {product.name}
            </h1>

            {/* Description */}
            {product.description && (
              <p className="text-[var(--color-text-muted)] text-lg leading-relaxed mb-8">
                {product.description}
              </p>
            )}

            {/* Metadata Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {product.preparationTime && (
                <div className="flex flex-col items-center justify-center p-3 bg-[var(--color-bg-tertiary)] rounded-xl border border-[var(--color-border-light)]">
                  <span className="material-symbols-outlined text-[var(--color-primary)] mb-1">schedule</span>
                  <span className="text-xs text-[var(--color-text-muted)] uppercase font-semibold">Prep time</span>
                  <span className="font-medium text-[var(--color-text)]">{product.preparationTime} min</span>
                </div>
              )}
              {product.calories && (
                <div className="flex flex-col items-center justify-center p-3 bg-[var(--color-bg-tertiary)] rounded-xl border border-[var(--color-border-light)]">
                  <span className="material-symbols-outlined text-[var(--color-primary)] mb-1">local_fire_department</span>
                  <span className="text-xs text-[var(--color-text-muted)] uppercase font-semibold">Calories</span>
                  <span className="font-medium text-[var(--color-text)]">{product.calories} Kcal</span>
                </div>
              )}
              {product.servingSize && (
                <div className="flex flex-col items-center justify-center p-3 bg-[var(--color-bg-tertiary)] rounded-xl border border-[var(--color-border-light)]">
                  <span className="material-symbols-outlined text-[var(--color-primary)] mb-1">local_cafe</span>
                  <span className="text-xs text-[var(--color-text-muted)] uppercase font-semibold">Serving</span>
                  <span className="font-medium text-[var(--color-text)]">{product.servingSize}</span>
                </div>
              )}
              {/* Show placeholder cards if not all metadata is available */}
              {!product.preparationTime && !product.calories && !product.servingSize && (
                <div className="col-span-3 flex flex-col items-center justify-center p-4 bg-[var(--color-bg-tertiary)] rounded-xl border border-[var(--color-border-light)]">
                  <span className="material-symbols-outlined text-[var(--color-primary)] mb-1">info</span>
                  <span className="text-sm text-[var(--color-text-muted)]">No additional details available</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Price & Points */}
            <div className="flex items-baseline gap-4 mb-8 flex-wrap">
              <span className="text-3xl font-bold text-[var(--color-primary)]">
                ₹{product.effectivePrice.toFixed(2)}
              </span>
              {product.hasActiveDiscount && product.discountedPrice !== null && (
                <span className="text-xl text-[var(--color-text-muted)] line-through decoration-2">
                  ₹{product.price.toFixed(2)}
                </span>
              )}
              <div className="ml-auto px-3 py-1 bg-[var(--color-gold-bg)] rounded-full flex items-center gap-1.5 border border-[var(--color-gold)]/20">
                <span className="material-symbols-outlined text-[var(--color-gold)]" style={{ fontSize: '16px' }}>loyalty</span>
                <span className="text-xs font-bold text-[var(--color-gold)]">Earns {formatPoints(product.royaltyPoints || 50)} pts</span>
              </div>
            </div>

            {/* Controls */}
            {product.isAvailable && isHydrated && (
              <div className="flex gap-4 items-stretch h-14">
                {/* Quantity Stepper */}
                <div className="flex items-center bg-[var(--color-bg-tertiary)] rounded-xl px-2 w-32 justify-between border border-[var(--color-border-light)]">
                  <button
                    onClick={() => handleQuantityChange(quantity - 1)}
                    className="size-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text)] transition-colors"
                    disabled={quantity <= 1}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>remove</span>
                  </button>
                  <span className="font-semibold text-lg w-6 text-center text-[var(--color-text)]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(quantity + 1)}
                    className="size-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text)] transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-xl font-bold text-base tracking-wide shadow-lg shadow-[var(--color-primary)]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <span>{isInCart ? 'Update Cart' : 'Add to Cart'}</span>
                  <span className="w-px h-5 bg-white/20"></span>
                  <span>₹{totalPrice.toFixed(2)}</span>
                </button>
              </div>
            )}

            {/* Out of Stock Button */}
            {!product.isAvailable && (
              <button
                disabled
                className="h-14 bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] rounded-xl font-bold cursor-not-allowed"
              >
                Out of Stock
              </button>
            )}

            {/* Points Earning Info */}
            {product.isAvailable && quantity > 0 && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[var(--color-text-muted)]">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>info</span>
                <span>You'll earn <strong className="text-[var(--color-gold)]">{formatPoints(totalPoints)} points</strong> with this purchase</span>
              </div>
            )}

            {/* Cart Link */}
            {isInCart && (
              <Link
                href="/cart"
                className="mt-4 text-center text-[var(--color-primary)] font-medium hover:underline flex items-center justify-center gap-1"
              >
                View Cart
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
              </Link>
            )}
          </div>
        </div>

        {/* Similar Items Section */}
        <SimilarProducts productId={product.id} limit={5} />
      </main>
    </div>
  );
}
