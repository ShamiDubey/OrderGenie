/**
 * Recommendation routes.
 * Provides API endpoints for AI-powered product recommendations.
 */

import { Router } from 'express';
import { recommendationController } from '../controllers/recommendation.controller';
import { adminAuth } from '../middleware/admin';

const router = Router();

// Public routes
router.get('/trending', recommendationController.getTrending);
router.get('/profile/:profileId', recommendationController.getPersonalized);
router.get('/product/:productId/similar', recommendationController.getSimilar);

// Admin routes
router.get('/admin/stats', adminAuth, recommendationController.getStats);
router.get('/admin/users', adminAuth, recommendationController.getUsers);
router.get('/admin/user/:profileId', adminAuth, recommendationController.getUserDetail);
router.post('/refresh', adminAuth, recommendationController.refresh);
router.post('/cleanup', adminAuth, recommendationController.cleanup);

export default router;
