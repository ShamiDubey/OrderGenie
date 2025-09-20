import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NormalizedProduct } from '@/lib/normalizers';

export interface CartItem {
  product: NormalizedProduct;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isHydrated: boolean;

  // Actions
  addItem: (product: NormalizedProduct, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setHydrated: () => void;

  // Computed values (as functions since Zustand doesn't have computed)
  getItemCount: () => number;
  getSubtotal: () => number;
  getDiscountTotal: () => number;
  getTotal: () => number;
  getItemByProductId: (productId: string) => CartItem | undefined;
}

/**
 * Safely convert a value to a number, returning 0 if invalid
 */
function safeNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Migrate old cart item to new format with numeric prices
 */
function migrateCartItem(item: any): CartItem | null {
  if (!item?.product?.id) return null;

  const product = item.product;

  // Convert all price-related fields to numbers
  const price = safeNumber(product.price);
  const effectivePrice = safeNumber(product.effectivePrice);
  const discountedPrice = product.discountedPrice != null ? safeNumber(product.discountedPrice) : null;

  // Calculate discount percent
  let discountPercent = 0;
  if (product.hasActiveDiscount && discountedPrice !== null && price > 0) {
    discountPercent = Math.round((1 - discountedPrice / price) * 100);
  }

  const normalizedProduct: NormalizedProduct = {
    id: product.id,
    name: product.name || 'Unknown Product',
    slug: product.slug || '',
    description: product.description || null,
    price: price,
    discountedPrice: discountedPrice,
    discountEnds: product.discountEnds || null,
    isVeg: product.isVeg ?? true,
    tags: product.tags || [],
    imageUrl: product.imageUrl || null,
    thumbnailUrl: product.thumbnailUrl || null,
    categoryId: product.categoryId || null,
    category: product.category || null,
    isAvailable: product.isAvailable ?? true,
    isFeatured: product.isFeatured ?? false,
    displayOrder: product.displayOrder || 0,
    preparationTime: product.preparationTime || null,
    calories: product.calories || null,
    servingSize: product.servingSize || null,
    effectivePrice: effectivePrice > 0 ? effectivePrice : price, // Fallback to price if effectivePrice is 0
    hasActiveDiscount: product.hasActiveDiscount ?? false,
    discountPercent: discountPercent,
    royaltyPoints: product.royaltyPoints || 50,
    createdAt: product.createdAt || new Date().toISOString(),
    updatedAt: product.updatedAt || new Date().toISOString(),
  };

  return {
    product: normalizedProduct,
    quantity: item.quantity || 1,
  };
}

/**
 * Migrate all cart items when loading from storage
 */
function migrateCartItems(items: any[]): CartItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map(migrateCartItem)
    .filter((item): item is CartItem => item !== null);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isHydrated: false,

      addItem: (product: NormalizedProduct, quantity: number = 1) => {
        // Ensure royaltyPoints has a value (default to 50 if missing)
        const normalizedProduct: NormalizedProduct = {
          ...product,
          royaltyPoints: product.royaltyPoints || 50,
        };

        set(state => {
          const existingIndex = state.items.findIndex(
            item => item.product.id === normalizedProduct.id
          );

          if (existingIndex >= 0) {
            // Update existing item quantity
            const newItems = [...state.items];
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              quantity: newItems[existingIndex].quantity + quantity,
            };
            return { items: newItems };
          }

          // Add new item
          return { items: [...state.items, { product: normalizedProduct, quantity }] };
        });
      },

      removeItem: (productId: string) => {
        set(state => ({
          items: state.items.filter(item => item.product.id !== productId),
        }));
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set(state => ({
          items: state.items.map(item =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      setHydrated: () => {
        set({ isHydrated: true });
      },

      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce((total, item) => {
          const price = safeNumber(item.product.price);
          return total + price * item.quantity;
        }, 0);
      },

      getDiscountTotal: () => {
        return get().items.reduce((total, item) => {
          const price = safeNumber(item.product.price);
          const effectivePrice = safeNumber(item.product.effectivePrice);
          const discount = (price - effectivePrice) * item.quantity;
          return total + Math.max(0, discount);
        }, 0);
      },

      getTotal: () => {
        return get().items.reduce((total, item) => {
          const effectivePrice = safeNumber(item.product.effectivePrice);
          return total + effectivePrice * item.quantity;
        }, 0);
      },

      getItemByProductId: (productId: string) => {
        return get().items.find(item => item.product.id === productId);
      },
    }),
    {
      name: 'ai-order-cart',
      // Migrate old cart data when loading from storage
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Error rehydrating cart:', error);
          return;
        }
        if (state) {
          // Migrate items to ensure numeric prices
          const migratedItems = migrateCartItems(state.items);
          state.items = migratedItems;
          state.setHydrated();
        }
      },
    }
  )
);
