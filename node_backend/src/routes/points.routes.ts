/**
 * Points Routes
 * API routes for royalty points operations.
 */

import { Router } from 'express';
import { pointsController } from '../controllers/points.controller';

const router = Router();

// Get user's points balance
router.get('/profile/:profileId', pointsController.getBalance);

// Get user's points history
router.get('/profile/:profileId/history', pointsController.getHistory);

export default router;
