import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { upload } from '../middleware/upload';
import { adminAuth } from '../middleware/admin';

const router = Router();

// PUBLIC ROUTES
router.get('/', (req, res) => categoryController.list(req, res));
router.get('/slug/:slug', (req, res) => categoryController.getBySlug(req, res));
router.get('/slug/:slug/products', (req, res) => categoryController.getProductsBySlug(req, res));
router.get('/:id', (req, res) => categoryController.getById(req, res));
router.get('/:id/products', (req, res) => categoryController.getProducts(req, res));

// ADMIN ROUTES
router.post('/', adminAuth, upload.single('image'), (req, res) => categoryController.create(req, res));
router.put('/:id', adminAuth, upload.single('image'), (req, res) => categoryController.update(req, res));
router.delete('/:id', adminAuth, (req, res) => categoryController.delete(req, res));

export default router;
