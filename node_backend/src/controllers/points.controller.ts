/**
 * Points Controller
 * Handles API requests for royalty points operations.
 */

import { Request, Response } from 'express';
import { pointsService } from '../services/points.service';

class PointsController {
  /**
   * GET /api/points/profile/:profileId
   * Get user's points balance.
   */
  async getBalance(req: Request, res: Response) {
    try {
      const { profileId } = req.params;

      if (!profileId) {
        return res.status(400).json({
          success: false,
          error: 'Profile ID is required',
        });
      }

      const result = await pointsService.getUserPoints(profileId);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error getting points balance:', error);

      if (error.message === 'Profile not found') {
        return res.status(404).json({
          success: false,
          error: 'Profile not found',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to get points balance',
      });
    }
  }

  /**
   * GET /api/points/profile/:profileId/history
   * Get user's points transaction history.
   */
  async getHistory(req: Request, res: Response) {
    try {
      const { profileId } = req.params;
      const { page = '1', limit = '20' } = req.query;

      if (!profileId) {
        return res.status(400).json({
          success: false,
          error: 'Profile ID is required',
        });
      }

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));

      const result = await pointsService.getPointsHistory(profileId, pageNum, limitNum);

      return res.json({
        success: true,
        data: result.transactions,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error('Error getting points history:', error);

      return res.status(500).json({
        success: false,
        error: 'Failed to get points history',
      });
    }
  }
}

export const pointsController = new PointsController();
