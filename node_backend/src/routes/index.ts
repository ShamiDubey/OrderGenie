import { Router } from 'express';
import faceRoutes from './face.routes';
import profileRoutes from './profile.routes';
import embeddingRoutes from './embedding.routes';
import productRoutes from './product.routes';
import categoryRoutes from './category.routes';
import orderRoutes from './order.routes';
import recommendationRoutes from './recommendation.routes';
import pointsRoutes from './points.routes';
import employeeRoutes from './employee.routes';

const router = Router();

router.use('/face', faceRoutes);
router.use('/profiles', profileRoutes);
router.use('/embeddings', embeddingRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/points', pointsRoutes);
router.use('/employees', employeeRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
