import { Decimal } from '@prisma/client/runtime/library';

interface ProductWithPricing {
  price: Decimal;
  discountedPrice: Decimal | null;
  discountEnds: Date | null;
}

/**
 * Check if a product's discount is currently active
 */
export function isDiscountActive(product: ProductWithPricing): boolean {
  if (!product.discountedPrice) return false;
  if (!product.discountEnds) return true; // No end date = always active
  return new Date() < product.discountEnds;
}

/**
 * Calculate the effective price (considering active discounts)
 */
export function calculateEffectivePrice(product: ProductWithPricing): string {
  if (isDiscountActive(product) && product.discountedPrice) {
    return product.discountedPrice.toString();
  }
  return product.price.toString();
}

/**
 * Calculate discount percentage
 */
export function calculateDiscountPercentage(product: ProductWithPricing): number | null {
  if (!isDiscountActive(product) || !product.discountedPrice) return null;

  const original = parseFloat(product.price.toString());
  const discounted = parseFloat(product.discountedPrice.toString());

  return Math.round(((original - discounted) / original) * 100);
}
