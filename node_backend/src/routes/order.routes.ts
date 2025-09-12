import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { adminAuth } from '../middleware/admin';

const router = Router();

// ============================================
// IMPORTANT: Route order matters!
// Specific routes must come before parameterized routes
// ============================================

// ============================================
// ADMIN ROUTES (specific paths first)
// ============================================

// List all orders (Admin) - must be before /:id
router.get('/', adminAuth, (req, res) => orderController.list(req, res));

// Analytics: Get most ordered products (Admin)
router.get('/analytics/top-products', adminAuth, (req, res) => orderController.getTopProducts(req, res));

// Analytics: Get profile's most ordered products (Admin)
router.get('/analytics/profile/:profileId', adminAuth, (req, res) => orderController.getProfileTopProducts(req, res));

// ============================================
// PUBLIC ROUTES (specific paths first)
// ============================================

// Create new order
router.post('/', (req, res) => orderController.create(req, res));

// Get order by order number (must be before /:id)
router.get('/number/:orderNumber', (req, res) => orderController.getByOrderNumber(req, res));

// Get orders by profile (order history) (must be before /:id)
router.get('/profile/:profileId', (req, res) => orderController.getByProfile(req, res));

// ============================================
// PARAMETERIZED ROUTES (last)
// ============================================

// Get order by ID
router.get('/:id', (req, res) => orderController.getById(req, res));

// Cancel order (only if PENDING)
router.patch('/:id/cancel', (req, res) => orderController.cancel(req, res));

// Update order status (Admin)
router.patch('/:id/status', adminAuth, (req, res) => orderController.updateStatus(req, res));

export default router;
