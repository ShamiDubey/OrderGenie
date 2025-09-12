import { prisma } from '../services/prisma';

/**
 * Generates a unique order number in format: ORD-YYYYMMDD-XXXXX
 * Example: ORD-20251231-00001
 */
export async function generateOrderNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ORD-${dateStr}-`;

  // Find the last order of today to get the counter
  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      orderNumber: 'desc',
    },
    select: {
      orderNumber: true,
    },
  });

  let counter = 1;
  if (lastOrder) {
    const lastCounter = parseInt(lastOrder.orderNumber.split('-')[2], 10);
    counter = lastCounter + 1;
  }

  return `${prefix}${counter.toString().padStart(5, '0')}`;
}

/**
 * Calculate effective price for a product (discounted if active, else regular)
 */
export function calculateEffectivePrice(
  price: number,
  discountedPrice: number | null,
  discountEnds: Date | null
): number {
  if (discountedPrice !== null && discountEnds !== null) {
    const now = new Date();
    if (now <= discountEnds) {
      return discountedPrice;
    }
  }
  return price;
}

/**
 * Check if discount is currently active for a product
 */
export function isDiscountActive(
  discountedPrice: number | null,
  discountEnds: Date | null
): boolean {
  if (discountedPrice === null || discountEnds === null) {
    return false;
  }
  return new Date() <= discountEnds;
}

/**
 * Transform Decimal fields to strings for JSON response
 */
export function transformOrderForResponse(order: {
  id: string;
  orderNumber: string;
  profileId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: string;
  notes: string | null;
  subtotal: unknown;
  discountTotal: unknown;
  taxAmount: unknown;
  grandTotal: unknown;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  items?: Array<{
    id: string;
    productId: string | null;
    productName: string;
    productSlug: string;
    quantity: number;
    unitPrice: unknown;
    discountedPrice: unknown;
    effectivePrice: unknown;
    lineTotal: unknown;
    isVeg: boolean;
    categoryName: string | null;
    createdAt: Date;
  }>;
  profile?: {
    id: string;
    name: string;
    email: string;
  } | null;
}) {
  return {
    ...order,
    subtotal: order.subtotal?.toString(),
    discountTotal: order.discountTotal?.toString(),
    taxAmount: order.taxAmount?.toString(),
    grandTotal: order.grandTotal?.toString(),
    items: order.items?.map((item) => ({
      ...item,
      unitPrice: item.unitPrice?.toString(),
      discountedPrice: item.discountedPrice?.toString() || null,
      effectivePrice: item.effectivePrice?.toString(),
      lineTotal: item.lineTotal?.toString(),
    })),
  };
}
