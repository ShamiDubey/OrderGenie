import { create } from 'zustand';
import { getProducts, getProductById, getProductBySlug, getCategories, getCategoryProducts } from '@/lib/api';
import { NormalizedProduct, NormalizedCategory, normalizeProducts, normalizeProduct, normalizeCategories } from '@/lib/normalizers';

interface ProductState {
  // Data
  products: NormalizedProduct[];
  productsById: Map<string, NormalizedProduct>;
  categories: NormalizedCategory[];
  categoriesById: Map<string, NormalizedCategory>;

  // Loading states
  isLoadingProducts: boolean;
  isLoadingCategories: boolean;

  // Fetch timestamps for cache invalidation
  productsFetchedAt: number | null;
  categoriesFetchedAt: number | null;

  // Error states
  productsError: string | null;
  categoriesError: string | null;

  // Actions
  fetchProducts: (force?: boolean) => Promise<void>;
  fetchCategories: (force?: boolean) => Promise<void>;
  fetchProductById: (id: string) => Promise<NormalizedProduct | null>;
  fetchProductBySlug: (slug: string) => Promise<NormalizedProduct | null>;
  fetchCategoryProducts: (categoryId: string) => Promise<NormalizedProduct[]>;
  getProductById: (id: string) => NormalizedProduct | undefined;
  getProductBySlug: (slug: string) => NormalizedProduct | undefined;
  getCategoryById: (id: string) => NormalizedCategory | undefined;
  getCategoryBySlug: (slug: string) => NormalizedCategory | undefined;
  getFeaturedProducts: () => NormalizedProduct[];
  getProductsByCategory: (categoryId: string) => NormalizedProduct[];
  searchProducts: (query: string) => NormalizedProduct[];
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const useProductStore = create<ProductState>((set, get) => ({
  // Initial state
  products: [],
  productsById: new Map(),
  categories: [],
  categoriesById: new Map(),
  isLoadingProducts: false,
  isLoadingCategories: false,
  productsFetchedAt: null,
  categoriesFetchedAt: null,
  productsError: null,
  categoriesError: null,

  // Fetch all products
  fetchProducts: async (force = false) => {
    const state = get();
    const now = Date.now();

    // Check cache validity
    if (
      !force &&
      state.productsFetchedAt &&
      now - state.productsFetchedAt < CACHE_DURATION &&
      state.products.length > 0
    ) {
      return;
    }

    // Prevent duplicate fetches
    if (state.isLoadingProducts) return;

    set({ isLoadingProducts: true, productsError: null });

    try {
      const result = await getProducts({ limit: 100 });

      if (result.success && result.data) {
        const normalizedProducts = normalizeProducts(result.data);
        const productsById = new Map(normalizedProducts.map(p => [p.id, p]));

        set({
          products: normalizedProducts,
          productsById,
          productsFetchedAt: now,
          isLoadingProducts: false,
        });
      } else {
        set({
          productsError: result.error || 'Failed to fetch products',
          isLoadingProducts: false,
        });
      }
    } catch (error) {
      set({
        productsError: error instanceof Error ? error.message : 'Unknown error',
        isLoadingProducts: false,
      });
    }
  },

  // Fetch all categories
  fetchCategories: async (force = false) => {
    const state = get();
    const now = Date.now();

    // Check cache validity
    if (
      !force &&
      state.categoriesFetchedAt &&
      now - state.categoriesFetchedAt < CACHE_DURATION &&
      state.categories.length > 0
    ) {
      return;
    }

    // Prevent duplicate fetches
    if (state.isLoadingCategories) return;

    set({ isLoadingCategories: true, categoriesError: null });

    try {
      const result = await getCategories();

      if (result.success && result.data) {
        const normalizedCategories = normalizeCategories(result.data);
        const categoriesById = new Map(normalizedCategories.map(c => [c.id, c]));

        set({
          categories: normalizedCategories,
          categoriesById,
          categoriesFetchedAt: now,
          isLoadingCategories: false,
        });
      } else {
        set({
          categoriesError: result.error || 'Failed to fetch categories',
          isLoadingCategories: false,
        });
      }
    } catch (error) {
      set({
        categoriesError: error instanceof Error ? error.message : 'Unknown error',
        isLoadingCategories: false,
      });
    }
  },

  // Fetch a single product by ID
  fetchProductById: async (id: string) => {
    const state = get();

    // Check if we already have it cached
    const cached = state.productsById.get(id);
    if (cached) return cached;

    try {
      const result = await getProductById(id);

      if (result.success && result.data) {
        const normalizedProduct = normalizeProduct(result.data);

        // Add to cache
        set(state => {
          const newProductsById = new Map(state.productsById);
          newProductsById.set(id, normalizedProduct);
          return {
            productsById: newProductsById,
            products: state.products.some(p => p.id === id)
              ? state.products.map(p => p.id === id ? normalizedProduct : p)
              : [...state.products, normalizedProduct],
          };
        });

        return normalizedProduct;
      }
      return null;
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  },

  // Fetch a single product by slug
  fetchProductBySlug: async (slug: string) => {
    const state = get();

    // Check if we already have it cached by slug
    const cached = state.products.find(p => p.slug === slug);
    if (cached) return cached;

    try {
      const result = await getProductBySlug(slug);

      if (result.success && result.data) {
        const normalizedProduct = normalizeProduct(result.data);

        // Add to cache
        set(state => {
          const newProductsById = new Map(state.productsById);
          newProductsById.set(normalizedProduct.id, normalizedProduct);
          return {
            productsById: newProductsById,
            products: state.products.some(p => p.id === normalizedProduct.id)
              ? state.products.map(p => p.id === normalizedProduct.id ? normalizedProduct : p)
              : [...state.products, normalizedProduct],
          };
        });

        return normalizedProduct;
      }
      return null;
    } catch (error) {
      console.error('Error fetching product by slug:', error);
      return null;
    }
  },

  // Fetch products by category
  fetchCategoryProducts: async (categoryId: string) => {
    try {
      const result = await getCategoryProducts(categoryId);

      if (result.success && result.data) {
        const normalizedProducts = normalizeProducts(result.data);

        // Update cache with these products
        set(state => {
          const newProductsById = new Map(state.productsById);
          normalizedProducts.forEach(p => newProductsById.set(p.id, p));

          // Merge with existing products, avoiding duplicates
          const existingIds = new Set(state.products.map(p => p.id));
          const newProducts = normalizedProducts.filter(p => !existingIds.has(p.id));

          return {
            productsById: newProductsById,
            products: [...state.products, ...newProducts],
          };
        });

        return normalizedProducts;
      }
      return [];
    } catch (error) {
      console.error('Error fetching category products:', error);
      return [];
    }
  },

  // Get product from cache
  getProductById: (id: string) => {
    return get().productsById.get(id);
  },

  // Get product by slug from cache
  getProductBySlug: (slug: string) => {
    return get().products.find(p => p.slug === slug);
  },

  // Get category from cache
  getCategoryById: (id: string) => {
    return get().categoriesById.get(id);
  },

  // Get category by slug from cache
  getCategoryBySlug: (slug: string) => {
    return get().categories.find(c => c.slug === slug);
  },

  // Get featured products from cache
  getFeaturedProducts: () => {
    return get().products.filter(p => p.isFeatured && p.isAvailable);
  },

  // Get products by category from cache
  getProductsByCategory: (categoryId: string) => {
    return get().products.filter(p => p.categoryId === categoryId);
  },

  // Search products in cache
  searchProducts: (query: string) => {
    const searchLower = query.toLowerCase();
    return get().products.filter(
      p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.tags.some(t => t.toLowerCase().includes(searchLower))
    );
  },
}));
