/**
 * Recommendation service with caching layer.
 * Manages cache for recommendations and calls Python backend for AI processing.
 */

import { prisma } from './prisma';
import {
  pythonClient,
  RecommendationWithReason,
  RecommendationProduct,
} from './python-client';

// Cache TTL in hours
const CACHE_TTL_HOURS = 24;
const SIMILAR_CACHE_TTL_HOURS = 168; // 7 days for similar products

interface CachedRecommendation {
  productId: string;
  score: number;
  reason: string;
  reasonType: string;
}

class RecommendationService {
  /**
   * Get personalized recommendations for a user.
   * Checks cache first, calls Python backend if cache miss.
   */
  async getPersonalized(
    profileId: string,
    context: string = 'homepage',
    limit: number = 10
  ) {
    // Check cache first
    const cached = await this.getFromCache(profileId, 'personalized', context);
    if (cached && !this.isExpired(cached.expiresAt)) {
      return {
        success: true,
        data: {
          recommendations: cached.recommendations,
          insights: cached.aiInsights,
          source: 'cache',
        },
      };
    }

    // Call Python backend
    const result = await pythonClient.generateRecommendations(profileId, limit);

    if (result.success && result.data) {
      // Save to cache
      await this.saveToCache(
        profileId,
        'personalized',
        context,
        result.data.recommendations || [],
        result.data.insights || null
      );

      return {
        success: true,
        data: {
          recommendations: result.data.recommendations,
          insights: result.data.insights,
          preferences: result.data.preferences,
          source: 'ai',
        },
      };
    }

    // If AI fails, try to return stale cache
    if (cached) {
      return {
        success: true,
        data: {
          recommendations: cached.recommendations,
          insights: cached.aiInsights,
          source: 'stale_cache',
        },
      };
    }

    // Fallback to trending
    return this.getTrending(limit);
  }

  /**
   * Get trending products (global recommendations).
   */
  async getTrending(limit: number = 10) {
    // Check global cache
    const cached = await this.getGlobalCache('trending');
    if (cached && !this.isExpired(cached.expiresAt)) {
      return {
        success: true,
        data: {
          products: cached.data,
          source: 'cache',
        },
      };
    }

    // Call Python backend
    const result = await pythonClient.getTrendingProducts(limit);

    if (result.success && result.data) {
      // Save to global cache
      await this.saveGlobalCache('trending', result.data.products);

      return {
        success: true,
        data: {
          products: result.data.products,
          source: 'computed',
        },
      };
    }

    // Return stale cache if available
    if (cached) {
      return {
        success: true,
        data: {
          products: cached.data,
          source: 'stale_cache',
        },
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to get trending products',
      data: { products: [], source: 'error' },
    };
  }

  /**
   * Get similar products for a given product.
   */
  async getSimilar(productId: string, limit: number = 5) {
    const context = `product:${productId}`;

    // Check cache
    const cached = await this.getFromCache(null, 'similar', context);
    if (cached && !this.isExpired(cached.expiresAt)) {
      return {
        success: true,
        data: {
          products: cached.recommendations,
          source: 'cache',
        },
      };
    }

    // Call Python backend
    const result = await pythonClient.getSimilarProducts(productId, limit);

    if (result.success && result.data) {
      // Save to cache (longer TTL for similar products)
      await this.saveToCache(
        null,
        'similar',
        context,
        result.data.products.map((p) => ({
          product: p,
          score: 0.8,
          reason: 'Similar item',
          reasonType: 'similar' as const,
        })),
        null,
        SIMILAR_CACHE_TTL_HOURS
      );

      return {
        success: true,
        data: {
          products: result.data.products,
          source: 'ai',
        },
      };
    }

    // Return stale cache if available
    if (cached) {
      return {
        success: true,
        data: {
          products: cached.recommendations,
          source: 'stale_cache',
        },
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to get similar products',
      data: { products: [], source: 'error' },
    };
  }

  /**
   * Update user preferences after an order.
   * Also saves the AI-generated insight and metadata to the UserPreference table.
   */
  async updatePreferencesAfterOrder(profileId: string) {
    try {
      // Analyze preferences via Python
      const result = await pythonClient.analyzePreferences(profileId);

      if (result.success && result.data) {
        // Convert insightMetadata to JSON-compatible format
        const insightMetadata = result.data.insightMetadata
          ? JSON.parse(JSON.stringify(result.data.insightMetadata))
          : {};

        // Save to UserPreference table including AI insight and metadata
        await prisma.userPreference.upsert({
          where: { profileId },
          create: {
            profileId,
            vegPreference: result.data.vegPreference,
            priceRange: result.data.priceRange,
            avgOrderValue: result.data.avgOrderValue || 0,
            categoryAffinities: result.data.categoryAffinities || {},
            tagAffinities: result.data.tagAffinities || {},
            favoriteProducts: result.data.favoriteProducts || [],
            totalOrders: result.data.totalOrders || 1,
            lastOrderAt: new Date(),
            // Store AI insight and metadata
            aiInsight: result.data.insight || null,
            insightMetadata: insightMetadata,
            insightUpdatedAt: new Date(),
          },
          update: {
            vegPreference: result.data.vegPreference,
            priceRange: result.data.priceRange,
            avgOrderValue: result.data.avgOrderValue || 0,
            categoryAffinities: result.data.categoryAffinities || {},
            tagAffinities: result.data.tagAffinities || {},
            favoriteProducts: result.data.favoriteProducts || [],
            totalOrders: result.data.totalOrders || 1,
            lastOrderAt: new Date(),
            // Update AI insight and metadata
            aiInsight: result.data.insight || null,
            insightMetadata: insightMetadata,
            insightUpdatedAt: new Date(),
          },
        });

        // Invalidate recommendations cache
        await this.invalidateUserCache(profileId);

        return { success: true };
      }

      return { success: false, error: result.error };
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Refresh recommendations for a user (admin action).
   */
  async refreshRecommendations(profileId: string) {
    // Invalidate cache
    await this.invalidateUserCache(profileId);

    // Generate new recommendations
    return this.getPersonalized(profileId, 'homepage', 10);
  }

  /**
   * Refresh global trending products.
   */
  async refreshGlobalTrending() {
    // Delete old trending cache
    await prisma.globalAnalytics.deleteMany({
      where: { type: 'trending' },
    });

    // Generate new trending
    return this.getTrending(20);
  }

  /**
   * Clean expired cache entries.
   */
  async cleanExpiredCache() {
    const now = new Date();

    const deleted = await prisma.recommendationCache.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    console.log(`Cleaned ${deleted.count} expired cache entries`);
    return deleted.count;
  }

  // Private helper methods

  private async getFromCache(
    profileId: string | null,
    type: string,
    context: string
  ) {
    try {
      return await prisma.recommendationCache.findUnique({
        where: {
          profileId_type_context: {
            profileId: profileId || '',
            type,
            context: context || '',
          },
        },
      });
    } catch {
      // Handle case where unique constraint key is null
      return await prisma.recommendationCache.findFirst({
        where: {
          profileId: profileId,
          type,
          context: context || null,
        },
      });
    }
  }

  private async saveToCache(
    profileId: string | null,
    type: string,
    context: string,
    recommendations: any[],
    aiInsights: string | null,
    ttlHours: number = CACHE_TTL_HOURS
  ) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    try {
      await prisma.recommendationCache.upsert({
        where: {
          profileId_type_context: {
            profileId: profileId || '',
            type,
            context: context || '',
          },
        },
        create: {
          profileId: profileId || null,
          type,
          context: context || null,
          recommendations: recommendations as any,
          aiInsights,
          expiresAt,
        },
        update: {
          recommendations: recommendations as any,
          aiInsights,
          expiresAt,
        },
      });
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  private async getGlobalCache(type: string) {
    return prisma.globalAnalytics.findUnique({
      where: { type },
    });
  }

  private async saveGlobalCache(type: string, data: any) {
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

    await prisma.globalAnalytics.upsert({
      where: { type },
      create: {
        type,
        data: data as any,
        computedAt: now,
        expiresAt,
      },
      update: {
        data: data as any,
        computedAt: now,
        expiresAt,
      },
    });
  }

  private async invalidateUserCache(profileId: string) {
    await prisma.recommendationCache.deleteMany({
      where: { profileId },
    });
  }

  private isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }
}

export const recommendationService = new RecommendationService();
