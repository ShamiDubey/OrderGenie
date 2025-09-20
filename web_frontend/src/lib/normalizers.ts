/**
 * Data normalizers - Transform API responses to have consistent numeric types
 * This ensures we never have NaN issues from string/number type mismatches
 */

import { Product, Category, Order, OrderItem, PaymentMethod } from '@/types';

// Normalized types with guaranteed numeric values
export interface NormalizedProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;  // Always a number
  discountedPrice: number | null;  // Always a number or null
  discountEnds: string | null;
  isVeg: boolean;
  tags: string[];
  imageUrl: string | null;
  thumbnailUrl: string | null;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  isAvailable: boolean;
  isFeatured: boolean;
  displayOrder: number;
  preparationTime: number | null;
  calories: number | null;
  servingSize: string | null;
  effectivePrice: number;  // Always a number
  hasActiveDiscount: boolean;
  discountPercent: number;  // Pre-calculated discount percentage
  royaltyPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface NormalizedCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NormalizedOrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  productSlug: string;
  quantity: number;
  unitPrice: number;
  discountedPrice: number | null;
  effectivePrice: number;
  lineTotal: number;
  isVeg: boolean;
  categoryName: string | null;
  royaltyPoints: number;
  createdAt: string;
}

export interface NormalizedOrder {
  id: string;
  orderNumber: string;
  profileId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: string;
  paymentMethod: PaymentMethod | null;
  pointsEarned: number | null;
  notes: string | null;
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  items: NormalizedOrderItem[];
}

/**
 * Safely parse a value to number, returning 0 if invalid
 */
function safeNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Safely parse a value to number or null
 */
function safeNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Normalize a product from API response
 */
export function normalizeProduct(product: Product): NormalizedProduct {
  const price = safeNumber(product.price);
  const discountedPrice = safeNumberOrNull(product.discountedPrice);
  let effectivePrice = safeNumber(product.effectivePrice);

  // Fallback: if effectivePrice is 0 or invalid, use discountedPrice or price
  if (effectivePrice <= 0) {
    effectivePrice = discountedPrice !== null && discountedPrice > 0 ? discountedPrice : price;
  }

  // Calculate discount percentage
  let discountPercent = 0;
  if (product.hasActiveDiscount && discountedPrice !== null && price > 0) {
    discountPercent = Math.round((1 - discountedPrice / price) * 100);
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price,
    discountedPrice,
    discountEnds: product.discountEnds,
    isVeg: product.isVeg,
    tags: product.tags || [],
    imageUrl: product.imageUrl,
    thumbnailUrl: product.thumbnailUrl,
    categoryId: product.categoryId,
    category: product.category,
    isAvailable: product.isAvailable,
    isFeatured: product.isFeatured,
    displayOrder: product.displayOrder,
    preparationTime: product.preparationTime,
    calories: product.calories,
    servingSize: product.servingSize,
    effectivePrice,
    hasActiveDiscount: product.hasActiveDiscount,
    discountPercent,
    royaltyPoints: product.royaltyPoints || 50,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

/**
 * Normalize an array of products
 */
export function normalizeProducts(products: Product[]): NormalizedProduct[] {
  return products.map(normalizeProduct);
}

/**
 * Normalize a category from API response
 */
export function normalizeCategory(category: Category): NormalizedCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    displayOrder: category.displayOrder,
    isActive: category.isActive,
    productCount: category._count?.products || 0,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

/**
 * Normalize an array of categories
 */
export function normalizeCategories(categories: Category[]): NormalizedCategory[] {
  return categories.map(normalizeCategory);
}

/**
 * Normalize an order item from API response
 */
export function normalizeOrderItem(item: OrderItem): NormalizedOrderItem {
  return {
    id: item.id,
    orderId: item.orderId,
    productId: item.productId,
    productName: item.productName,
    productSlug: item.productSlug,
    quantity: item.quantity,
    unitPrice: safeNumber(item.unitPrice),
    discountedPrice: safeNumberOrNull(item.discountedPrice),
    effectivePrice: safeNumber(item.effectivePrice),
    lineTotal: safeNumber(item.lineTotal),
    isVeg: item.isVeg,
    categoryName: item.categoryName,
    royaltyPoints: item.royaltyPoints || 0,
    createdAt: item.createdAt,
  };
}

/**
 * Normalize an order from API response
 */
export function normalizeOrder(order: Order): NormalizedOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    profileId: order.profileId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    status: order.status,
    paymentMethod: order.paymentMethod,
    pointsEarned: order.pointsEarned,
    notes: order.notes,
    subtotal: safeNumber(order.subtotal),
    discountTotal: safeNumber(order.discountTotal),
    taxAmount: safeNumber(order.taxAmount),
    grandTotal: safeNumber(order.grandTotal),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    confirmedAt: order.confirmedAt,
    completedAt: order.completedAt,
    cancelledAt: order.cancelledAt,
    items: order.items.map(normalizeOrderItem),
  };
}

/**
 * Normalize an array of orders
 */
export function normalizeOrders(orders: Order[]): NormalizedOrder[] {
  return orders.map(normalizeOrder);
}

// ============ RECOMMENDATION NORMALIZERS ============

import { RecommendationProduct, RecommendationWithReason } from './api';

export interface NormalizedRecommendationProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discountedPrice: number | null;
  discountEnds: string | null;
  isVeg: boolean;
  tags: string[];
  imageUrl: string | null;
  thumbnailUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  preparationTime: number | null;
  calories: number | null;
  servingSize: string | null;
  effectivePrice: number;
  hasActiveDiscount: boolean;
  discountPercent: number;
  royaltyPoints: number;
}

export interface NormalizedRecommendation {
  product: NormalizedRecommendationProduct;
  score: number;
  reason: string;
  reasonType: 'preference' | 'history' | 'trending' | 'similar';
}

/**
 * Normalize a recommendation product from API response (snake_case to camelCase)
 */
export function normalizeRecommendationProduct(product: RecommendationProduct): NormalizedRecommendationProduct {
  const price = safeNumber(product.price);
  const discountedPrice = safeNumberOrNull(product.discounted_price);

  // Calculate effective price
  let hasActiveDiscount = false;
  let effectivePrice = price;

  if (discountedPrice !== null && discountedPrice > 0 && discountedPrice < price) {
    if (product.discount_ends) {
      hasActiveDiscount = new Date(product.discount_ends) > new Date();
    } else {
      hasActiveDiscount = true;
    }
    if (hasActiveDiscount) {
      effectivePrice = discountedPrice;
    }
  }

  // Calculate discount percentage
  let discountPercent = 0;
  if (hasActiveDiscount && discountedPrice !== null && price > 0) {
    discountPercent = Math.round((1 - discountedPrice / price) * 100);
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price,
    discountedPrice,
    discountEnds: product.discount_ends,
    isVeg: product.is_veg,
    tags: product.tags || [],
    imageUrl: product.image_url,
    thumbnailUrl: product.thumbnail_url,
    categoryId: product.category_id,
    categoryName: product.category_name,
    categorySlug: product.category_slug,
    isAvailable: product.is_available,
    isFeatured: product.is_featured,
    preparationTime: product.preparation_time,
    calories: product.calories,
    servingSize: product.serving_size,
    effectivePrice,
    hasActiveDiscount,
    discountPercent,
    royaltyPoints: product.royalty_points ?? 50,
  };
}

/**
 * Normalize an array of recommendation products
 */
export function normalizeRecommendationProducts(products: RecommendationProduct[]): NormalizedRecommendationProduct[] {
  return products.map(normalizeRecommendationProduct);
}

/**
 * Normalize a recommendation with reason
 */
export function normalizeRecommendation(rec: RecommendationWithReason): NormalizedRecommendation {
  return {
    product: normalizeRecommendationProduct(rec.product),
    score: safeNumber(rec.score),
    reason: rec.reason,
    reasonType: rec.reasonType,
  };
}

/**
 * Normalize an array of recommendations
 */
export function normalizeRecommendations(recs: RecommendationWithReason[]): NormalizedRecommendation[] {
  return recs.map(normalizeRecommendation);
}

// ============ CHAT PRODUCT NORMALIZERS ============

import { ChatProduct } from '@/stores/chatStore';

/**
 * Convert a ChatProduct (from Python backend) to NormalizedProduct for cart integration
 */
export function chatProductToNormalizedProduct(product: ChatProduct): NormalizedProduct {
  const price = safeNumber(product.price);
  const discountedPrice = safeNumberOrNull(product.discounted_price);
  const effectivePrice = safeNumber(product.effective_price) || (discountedPrice ?? price);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price,
    discountedPrice,
    discountEnds: null,
    isVeg: product.is_veg,
    tags: product.tags || [],
    imageUrl: product.image_url,
    thumbnailUrl: product.thumbnail_url,
    categoryId: product.category_id,
    category: product.category_id && product.category_name ? {
      id: product.category_id,
      name: product.category_name,
      slug: product.category_slug || product.category_name.toLowerCase().replace(/\s+/g, '-'),
    } : null,
    isAvailable: product.is_available,
    isFeatured: product.is_featured,
    displayOrder: 0,
    preparationTime: product.preparation_time,
    calories: product.calories,
    servingSize: null,
    effectivePrice,
    hasActiveDiscount: product.has_active_discount,
    discountPercent: product.discount_percent,
    royaltyPoints: product.royalty_points ?? 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Convert an array of ChatProducts to NormalizedProducts
 */
export function chatProductsToNormalizedProducts(products: ChatProduct[]): NormalizedProduct[] {
  return products.map(chatProductToNormalizedProduct);
}
