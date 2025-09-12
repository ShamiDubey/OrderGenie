import { Router } from 'express';
import { profileController } from '../controllers/profile.controller';

const router = Router();

// DELETE /api/embeddings/:id - Delete specific embedding
router.delete('/:id', (req, res) => profileController.deleteEmbedding(req, res));

export default router;
