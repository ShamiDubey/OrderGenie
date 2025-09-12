import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { upload } from '../middleware/upload';
import { adminAuth } from '../middleware/admin';

const router = Router();

// PUBLIC ROUTES
router.get('/', (req, res) => productController.list(req, res));
router.get('/featured', (req, res) => productController.getFeatured(req, res));
router.get('/slug/:slug', (req, res) => productController.getBySlug(req, res));
router.get('/:id', (req, res) => productController.getById(req, res));

// ADMIN ROUTES
router.post('/', adminAuth, upload.single('image'), (req, res) => productController.create(req, res));
router.put('/:id', adminAuth, upload.single('image'), (req, res) => productController.update(req, res));
router.patch('/:id/availability', adminAuth, (req, res) => productController.toggleAvailability(req, res));
router.delete('/:id', adminAuth, (req, res) => productController.delete(req, res));

export default router;
