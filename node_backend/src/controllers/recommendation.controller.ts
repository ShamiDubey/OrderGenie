/**
 * Recommendation controller.
 * Handles API requests for personalized product recommendations.
 */

import { Request, Response } from 'express';
import { recommendationService } from '../services/recommendation.service';
import { prisma } from '../services/prisma';

class RecommendationController {
  /**
   * GET /api/recommendations/profile/:profileId
   * Get personalized recommendations for a user.
   */
  async getPersonalized(req: Request, res: Response) {
    try {
      const { profileId } = req.params;
      const { limit = '10', context = 'homepage' } = req.query;

      if (!profileId) {
        return res.status(400).json({
          success: false,
          error: 'Profile ID is required',
        });
      }

      const limitNum = Math.min(Math.max(parseInt(limit as string) || 10, 1), 50);

      const result = await recommendationService.getPersonalized(
        profileId,
        context as string,
        limitNum
      );

      return res.json(result);
    } catch (error: any) {
      console.error('Error getting personalized recommendations:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get recommendations',
      });
    }
  }

  /**
   * GET /api/recommendations/trending
   * Get globally trending products.
   */
  async getTrending(req: Request, res: Response) {
    try {
      const { limit = '10' } = req.query;
      const limitNum = Math.min(Math.max(parseInt(limit as string) || 10, 1), 50);

      const result = await recommendationService.getTrending(limitNum);

      return res.json(result);
    } catch (error: any) {
      console.error('Error getting trending products:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get trending products',
      });
    }
  }

  /**
   * GET /api/recommendations/product/:productId/similar
   * Get products similar to a given product.
   */
  async getSimilar(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const { limit = '5' } = req.query;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required',
        });
      }

      const limitNum = Math.min(Math.max(parseInt(limit as string) || 5, 1), 20);

      const result = await recommendationService.getSimilar(productId, limitNum);

      return res.json(result);
    } catch (error: any) {
      console.error('Error getting similar products:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get similar products',
      });
    }
  }

  /**
   * POST /api/recommendations/refresh (Admin only)
   * Refresh recommendations for a user or global trending.
   */
  async refresh(req: Request, res: Response) {
    try {
      const { profileId } = req.body;

      if (profileId) {
        // Refresh specific user's recommendations
        await recommendationService.refreshRecommendations(profileId);
        return res.json({
          success: true,
          message: `Recommendations refreshed for profile ${profileId}`,
        });
      } else {
        // Refresh global trending
        await recommendationService.refreshGlobalTrending();
        return res.json({
          success: true,
          message: 'Global trending products refreshed',
        });
      }
    } catch (error: any) {
      console.error('Error refreshing recommendations:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to refresh recommendations',
      });
    }
  }

  /**
   * POST /api/recommendations/cleanup (Admin only)
   * Clean expired cache entries.
   */
  async cleanup(req: Request, res: Response) {
    try {
      const count = await recommendationService.cleanExpiredCache();
      return res.json({
        success: true,
        message: `Cleaned ${count} expired cache entries`,
      });
    } catch (error: any) {
      console.error('Error cleaning cache:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to clean cache',
      });
    }
  }

  /**
   * GET /api/recommendations/admin/users (Admin only)
   * Get all users with their preferences and recommendation stats.
   */
  async getUsers(req: Request, res: Response) {
    try {
      const { page = '1', limit = '20' } = req.query;
      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
      const skip = (pageNum - 1) * limitNum;

      // Get profiles with their preferences and order counts
      const [profiles, total] = await Promise.all([
        prisma.faceProfile.findMany({
          include: {
            preferences: true,
            _count: {
              select: { orders: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.faceProfile.count(),
      ]);

      // Get cache status for each profile
      const profileIds = profiles.map((p) => p.id);
      const cacheEntries = await prisma.recommendationCache.findMany({
        where: {
          profileId: { in: profileIds },
          type: 'personalized',
        },
        select: {
          profileId: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      const cacheMap = new Map(cacheEntries.map((c) => [c.profileId, c]));

      const usersWithStats = profiles.map((profile) => {
        const cache = cacheMap.get(profile.id);
        const now = new Date();

        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          createdAt: profile.createdAt,
          orderCount: profile._count.orders,
          hasPreferences: !!profile.preferences,
          preferences: profile.preferences
            ? {
                vegPreference: profile.preferences.vegPreference,
                priceRange: profile.preferences.priceRange,
                totalOrders: profile.preferences.totalOrders,
                lastOrderAt: profile.preferences.lastOrderAt,
                avgOrderValue: profile.preferences.avgOrderValue,
              }
            : null,
          cacheStatus: cache
            ? {
                hasCache: true,
                isExpired: now > cache.expiresAt,
                expiresAt: cache.expiresAt,
                createdAt: cache.createdAt,
              }
            : { hasCache: false, isExpired: true },
        };
      });

      return res.json({
        success: true,
        data: usersWithStats,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1,
        },
      });
    } catch (error: any) {
      console.error('Error getting users:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get users',
      });
    }
  }

  /**
   * GET /api/recommendations/admin/user/:profileId (Admin only)
   * Get detailed recommendation data for a specific user.
   */
  async getUserDetail(req: Request, res: Response) {
    try {
      const { profileId } = req.params;

      // Get profile with preferences
      const profile = await prisma.faceProfile.findUnique({
        where: { id: profileId },
        include: {
          preferences: true,
          orders: {
            include: { items: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'Profile not found',
        });
      }

      // Get cached recommendations
      const cache = await prisma.recommendationCache.findFirst({
        where: {
          profileId,
          type: 'personalized',
        },
      });

      // Get fresh recommendations
      const recommendations = await recommendationService.getPersonalized(
        profileId,
        'admin',
        10
      );

      return res.json({
        success: true,
        data: {
          profile: {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            createdAt: profile.createdAt,
          },
          preferences: profile.preferences
            ? {
                vegPreference: profile.preferences.vegPreference,
                priceRange: profile.preferences.priceRange,
                avgOrderValue: profile.preferences.avgOrderValue,
                categoryAffinities: profile.preferences.categoryAffinities,
                tagAffinities: profile.preferences.tagAffinities,
                favoriteProducts: profile.preferences.favoriteProducts,
                totalOrders: profile.preferences.totalOrders,
                lastOrderAt: profile.preferences.lastOrderAt,
              }
            : null,
          recentOrders: profile.orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            grandTotal: order.grandTotal,
            status: order.status,
            createdAt: order.createdAt,
            itemCount: order.items.length,
            items: order.items.map((item) => ({
              productName: item.productName,
              quantity: item.quantity,
              isVeg: item.isVeg,
            })),
          })),
          recommendations: recommendations.data,
          cacheInfo: cache
            ? {
                createdAt: cache.createdAt,
                expiresAt: cache.expiresAt,
                isExpired: new Date() > cache.expiresAt,
                aiInsights: cache.aiInsights,
              }
            : null,
        },
      });
    } catch (error: any) {
      console.error('Error getting user detail:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get user detail',
      });
    }
  }

  /**
   * GET /api/recommendations/admin/stats (Admin only)
   * Get overall recommendation system statistics.
   */
  async getStats(req: Request, res: Response) {
    try {
      const now = new Date();

      const [
        totalProfiles,
        profilesWithPreferences,
        totalCacheEntries,
        expiredCacheEntries,
        globalAnalytics,
      ] = await Promise.all([
        prisma.faceProfile.count(),
        prisma.userPreference.count(),
        prisma.recommendationCache.count(),
        prisma.recommendationCache.count({
          where: { expiresAt: { lt: now } },
        }),
        prisma.globalAnalytics.findMany(),
      ]);

      const trendingCache = globalAnalytics.find((g) => g.type === 'trending');

      return res.json({
        success: true,
        data: {
          users: {
            total: totalProfiles,
            withPreferences: profilesWithPreferences,
            withoutPreferences: totalProfiles - profilesWithPreferences,
          },
          cache: {
            total: totalCacheEntries,
            expired: expiredCacheEntries,
            active: totalCacheEntries - expiredCacheEntries,
          },
          trending: trendingCache
            ? {
                lastComputed: trendingCache.computedAt,
                expiresAt: trendingCache.expiresAt,
                isExpired: now > trendingCache.expiresAt,
                productCount: Array.isArray(trendingCache.data)
                  ? trendingCache.data.length
                  : 0,
              }
            : null,
        },
      });
    } catch (error: any) {
      console.error('Error getting stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get stats',
      });
    }
  }
}

export const recommendationController = new RecommendationController();
