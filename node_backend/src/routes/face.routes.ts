import { Router } from 'express';
import { faceController } from '../controllers/face.controller';
import { upload } from '../middleware/upload';

const router = Router();

// POST /api/face/detect - Detect faces in image
router.post('/detect', upload.single('image'), (req, res) => faceController.detect(req, res));

// POST /api/face/recognize - Match face against registered profiles
router.post('/recognize', upload.single('image'), (req, res) => faceController.recognize(req, res));

export default router;
