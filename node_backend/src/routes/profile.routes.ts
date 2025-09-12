import { Router } from 'express';
import { profileController } from '../controllers/profile.controller';
import { upload } from '../middleware/upload';

const router = Router();

// POST /api/profiles/register - Register face with name, email, image (all in one)
router.post('/register', upload.single('image'), (req, res) => profileController.register(req, res));

// POST /api/profiles/login - Login with username/password (for kiosk)
router.post('/login', (req, res) => profileController.login(req, res));

// GET /api/profiles/check-username/:username - Check if username is available
router.get('/check-username/:username', (req, res) => profileController.checkUsername(req, res));

// GET /api/profiles - List all profiles
router.get('/', (req, res) => profileController.list(req, res));

// GET /api/profiles/:id - Get profile with embeddings
router.get('/:id', (req, res) => profileController.get(req, res));

// PUT /api/profiles/:id - Update profile (name, username, phone, address, avatar)
router.put('/:id', upload.single('avatar'), (req, res) => profileController.update(req, res));

// DELETE /api/profiles/:id - Delete profile
router.delete('/:id', (req, res) => profileController.delete(req, res));

// DELETE /api/profiles/:id/avatar - Remove avatar from profile
router.delete('/:id/avatar', (req, res) => profileController.removeAvatar(req, res));

// POST /api/profiles/:id/embeddings - Add additional face to existing profile
router.post('/:id/embeddings', upload.single('image'), (req, res) => profileController.addEmbedding(req, res));

export default router;
