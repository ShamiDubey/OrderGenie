import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  pythonBackendUrl: process.env.PYTHON_BACKEND_URL || 'http://localhost:8000',
  databaseUrl: process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Face recognition thresholds
  faceMaxDistance: parseFloat(process.env.FACE_MAX_DISTANCE || '0.6'),
  faceMinSimilarity: parseFloat(process.env.FACE_MIN_SIMILARITY || '0.4'),

  // Admin authentication
  adminToken: process.env.ADMIN_TOKEN || '123',

  // Cloudinary
  cloudinaryUrl: process.env.CLOUDINARY_URL,
};
