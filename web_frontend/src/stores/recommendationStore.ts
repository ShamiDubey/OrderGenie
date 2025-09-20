import { create } from 'zustand';
import {
  getPersonalizedRecommendations,
  getTrendingProducts,
  getSimilarProducts,
} from '@/lib/api';
import {
  NormalizedRecommendation,
  NormalizedRecommendationProduct,
  normalizeRecommendations,
  normalizeRecommendationProducts,
} from '@/lib/normalizers';

interface RecommendationState {
  // Personalized recommendations for the current user
  personalizedRecommendations: NormalizedRecommendation[];
  personalizedInsights: string | null;

  // Trending products (global)
  trendingProducts: NormalizedRecommendationProduct[];

  // Similar products cache (keyed by product ID)
  similarProducts: Map<string, NormalizedRecommendationProduct[]>;

  // Loading states
  isLoadingPersonalized: boolean;
  isLoadingTrending: boolean;
  isLoadingSimilar: Map<string, boolean>;

  // Error states
  personalizedError: string | null;
  trendingError: string | null;
  similarError: Map<string, string>;

  // Data source (cache, ai, stale_cache)
  personalizedSource: string | null;
  trendingSource: string | null;

  // Fetch timestamps for cache invalidation
  personalizedFetchedAt: number | null;
  trendingFetchedAt: number | null;

  // Current profile ID
  currentProfileId: string | null;

  // Actions
  fetchPersonalized: (profileId: string, context?: string, limit?: number) => Promise<void>;
  fetchTrending: (limit?: number, force?: boolean) => Promise<void>;
  fetchSimilar: (productId: string, limit?: number) => Promise<void>;
  clearPersonalized: () => void;
  clearAll: () => void;
  getSimilarForProduct: (productId: string) => NormalizedRecommendationProduct[];
}

// Cache durations
const PERSONALIZED_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const TRENDING_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const useRecommendationStore = create<RecommendationState>((set, get) => ({
  // Initial state
  personalizedRecommendations: [],
  personalizedInsights: null,
  trendingProducts: [],
  similarProducts: new Map(),
  isLoadingPersonalized: false,
  isLoadingTrending: false,
  isLoadingSimilar: new Map(),
  personalizedError: null,
  trendingError: null,
  similarError: new Map(),
  personalizedSource: null,
  trendingSource: null,
  personalizedFetchedAt: null,
  trendingFetchedAt: null,
  currentProfileId: null,

  // Fetch personalized recommendations
  fetchPersonalized: async (profileId: string, context = 'homepage', limit = 10) => {
    const state = get();
    const now = Date.now();

    // Check cache validity (only if same profile)
    if (
      state.currentProfileId === profileId &&
      state.personalizedFetchedAt &&
      now - state.personalizedFetchedAt < PERSONALIZED_CACHE_DURATION &&
      state.personalizedRecommendations.length > 0
    ) {
      return;
    }

    // Prevent duplicate fetches
    if (state.isLoadingPersonalized) return;

    set({ isLoadingPersonalized: true, personalizedError: null });

    try {
      const result = await getPersonalizedRecommendations(profileId, context, limit);

      if (result.success && result.data) {
        const normalizedRecs = normalizeRecommendations(result.data.recommendations || []);

        set({
          personalizedRecommendations: normalizedRecs,
          personalizedInsights: result.data.insights || null,
          personalizedSource: result.data.source || 'unknown',
          personalizedFetchedAt: now,
          currentProfileId: profileId,
          isLoadingPersonalized: false,
        });
      } else {
        set({
          personalizedError: result.error || 'Failed to fetch recommendations',
          isLoadingPersonalized: false,
        });
      }
    } catch (error) {
      set({
        personalizedError: error instanceof Error ? error.message : 'Unknown error',
        isLoadingPersonalized: false,
      });
    }
  },

  // Fetch trending products
  fetchTrending: async (limit = 10, force = false) => {
    const state = get();
    const now = Date.now();

    // Check cache validity
    if (
      !force &&
      state.trendingFetchedAt &&
      now - state.trendingFetchedAt < TRENDING_CACHE_DURATION &&
      state.trendingProducts.length > 0
    ) {
      return;
    }

    // Prevent duplicate fetches
    if (state.isLoadingTrending) return;

    set({ isLoadingTrending: true, trendingError: null });

    try {
      const result = await getTrendingProducts(limit);

      if (result.success && result.data) {
        const normalizedProducts = normalizeRecommendationProducts(result.data.products || []);

        set({
          trendingProducts: normalizedProducts,
          trendingSource: result.data.source || 'unknown',
          trendingFetchedAt: now,
          isLoadingTrending: false,
        });
      } else {
        set({
          trendingError: result.error || 'Failed to fetch trending products',
          isLoadingTrending: false,
        });
      }
    } catch (error) {
      set({
        trendingError: error instanceof Error ? error.message : 'Unknown error',
        isLoadingTrending: false,
      });
    }
  },

  // Fetch similar products for a specific product
  fetchSimilar: async (productId: string, limit = 5) => {
    const state = get();

    // Check if already cached
    if (state.similarProducts.has(productId) && state.similarProducts.get(productId)!.length > 0) {
      return;
    }

    // Check if already loading
    if (state.isLoadingSimilar.get(productId)) return;

    // Set loading state
    const newLoadingMap = new Map(state.isLoadingSimilar);
    newLoadingMap.set(productId, true);
    set({ isLoadingSimilar: newLoadingMap });

    try {
      const result = await getSimilarProducts(productId, limit);

      if (result.success && result.data) {
        const normalizedProducts = normalizeRecommendationProducts(result.data.products || []);

        set(state => {
          const newSimilarProducts = new Map(state.similarProducts);
          newSimilarProducts.set(productId, normalizedProducts);

          const newLoadingMap = new Map(state.isLoadingSimilar);
          newLoadingMap.set(productId, false);

          return {
            similarProducts: newSimilarProducts,
            isLoadingSimilar: newLoadingMap,
          };
        });
      } else {
        set(state => {
          const newErrorMap = new Map(state.similarError);
          newErrorMap.set(productId, result.error || 'Failed to fetch similar products');

          const newLoadingMap = new Map(state.isLoadingSimilar);
          newLoadingMap.set(productId, false);

          return {
            similarError: newErrorMap,
            isLoadingSimilar: newLoadingMap,
          };
        });
      }
    } catch (error) {
      set(state => {
        const newErrorMap = new Map(state.similarError);
        newErrorMap.set(productId, error instanceof Error ? error.message : 'Unknown error');

        const newLoadingMap = new Map(state.isLoadingSimilar);
        newLoadingMap.set(productId, false);

        return {
          similarError: newErrorMap,
          isLoadingSimilar: newLoadingMap,
        };
      });
    }
  },

  // Clear personalized recommendations (on logout)
  clearPersonalized: () => {
    set({
      personalizedRecommendations: [],
      personalizedInsights: null,
      personalizedSource: null,
      personalizedFetchedAt: null,
      currentProfileId: null,
      personalizedError: null,
    });
  },

  // Clear all recommendations
  clearAll: () => {
    set({
      personalizedRecommendations: [],
      personalizedInsights: null,
      trendingProducts: [],
      similarProducts: new Map(),
      isLoadingPersonalized: false,
      isLoadingTrending: false,
      isLoadingSimilar: new Map(),
      personalizedError: null,
      trendingError: null,
      similarError: new Map(),
      personalizedSource: null,
      trendingSource: null,
      personalizedFetchedAt: null,
      trendingFetchedAt: null,
      currentProfileId: null,
    });
  },

  // Get similar products for a product (from cache)
  getSimilarForProduct: (productId: string) => {
    return get().similarProducts.get(productId) || [];
  },
}));
