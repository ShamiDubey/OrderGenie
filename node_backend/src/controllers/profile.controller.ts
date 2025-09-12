import { Request, Response } from 'express';
import { pythonClient } from '../services/python-client';
import { prisma } from '../services/prisma';
import { cloudinaryService } from '../services/cloudinary';

export class ProfileController {
  // Register face with name, email, and image in one request
  async register(req: Request, res: Response) {
    try {
      const { name, email, createdBy } = req.body;
      const file = req.file;

      console.log('\n========== FACE REGISTRATION STARTED ==========');
      console.log(`[Step 1] Received registration request`);
      console.log(`         Name: ${name}`);
      console.log(`         Email: ${email}`);
      console.log(`         Created By: ${createdBy || 'APP (default)'}`);
      console.log(`         Image: ${file?.originalname || 'NOT PROVIDED'}`);

      // Validation
      if (!name || !email) {
        console.log('[ERROR] Missing required fields');
        return res.status(400).json({ success: false, error: 'Name and email are required' });
      }

      if (!file) {
        console.log('[ERROR] No image file provided');
        return res.status(400).json({ success: false, error: 'Image file is required' });
      }

      // Check if email already exists
      console.log(`\n[Step 2] Checking if email already exists...`);
      const existingProfile = await prisma.faceProfile.findUnique({ where: { email } });
      if (existingProfile) {
        console.log(`[ERROR] Email ${email} already registered`);
        return res.status(400).json({ success: false, error: 'Email already registered' });
      }
      console.log(`         Email is available`);

      // Get embedding from Python backend
      console.log(`\n[Step 3] Sending image to Python backend for embedding...`);
      const startTime = Date.now();
      const embeddingResult = await pythonClient.getEmbeddings(file.buffer, file.originalname);
      const embeddingTime = Date.now() - startTime;
      console.log(`         Python response received in ${embeddingTime}ms`);

      if (!embeddingResult.success || !embeddingResult.embeddings?.length) {
        console.log(`[ERROR] Face detection failed: ${embeddingResult.error || 'No face detected'}`);
        return res.status(400).json({
          success: false,
          error: embeddingResult.error || 'No face detected in image',
        });
      }

      const embData = embeddingResult.embeddings[0];
      console.log(`         Face detected with confidence: ${(embData.confidence * 100).toFixed(2)}%`);
      console.log(`         Embedding size: ${embData.embedding.length} dimensions`);

      // Create profile in database
      console.log(`\n[Step 4] Creating profile in database...`);
      const profile = await prisma.faceProfile.create({
        data: {
          name,
          email,
          createdBy: createdBy || 'APP', // Default to APP for self-registration
        },
      });
      console.log(`         Profile created with ID: ${profile.id}`);

      // Store embedding in database
      console.log(`\n[Step 5] Storing face embedding in database...`);
      const embedding = await prisma.faceEmbedding.create({
        data: {
          profileId: profile.id,
          embedding: embData.embedding,
          confidence: embData.confidence,
          modelName: embeddingResult.model,
        },
      });
      console.log(`         Embedding stored with ID: ${embedding.id}`);

      const totalTime = Date.now() - startTime;
      console.log(`\n========== REGISTRATION COMPLETE ==========`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Profile ID: ${profile.id}`);
      console.log(`============================================\n`);

      return res.status(201).json({
        success: true,
        data: {
          profile: {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            createdBy: profile.createdBy,
            createdAt: profile.createdAt,
          },
          embedding: {
            id: embedding.id,
            confidence: embedding.confidence,
            modelName: embedding.modelName,
          },
          processingTimeMs: totalTime,
        },
      });
    } catch (error) {
      console.error('[ERROR] Registration failed:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  }

  // Check if username is available
  async checkUsername(req: Request, res: Response) {
    try {
      const { username } = req.params;
      const { excludeId } = req.query; // Optional: exclude current user's ID when updating

      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Username is required',
        });
      }

      const existingProfile = await prisma.faceProfile.findUnique({
        where: { username },
      });

      // If no profile found, username is available
      if (!existingProfile) {
        return res.json({
          success: true,
          data: { available: true },
        });
      }

      // If excludeId is provided and matches, username is available (user's own username)
      if (excludeId && existingProfile.id === excludeId) {
        return res.json({
          success: true,
          data: { available: true },
        });
      }

      return res.json({
        success: true,
        data: { available: false },
      });
    } catch (error) {
      console.error('Check username error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check username',
      });
    }
  }

  // Login with username/password (for kiosk)
  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required',
        });
      }

      // Find profile by username
      const profile = await prisma.faceProfile.findUnique({
        where: { username },
      });

      if (!profile) {
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password',
        });
      }

      // Simple string comparison (no encryption as per requirements)
      if (profile.password !== password) {
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password',
        });
      }

      return res.json({
        success: true,
        data: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          username: profile.username,
          phone: profile.phone,
          totalPoints: profile.totalPoints,
          avatarUrl: profile.avatarUrl,
          dietaryPreference: profile.dietaryPreference,
          hideNonVeg: profile.hideNonVeg,
          createdAt: profile.createdAt,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  }

  // List all profiles
  async list(req: Request, res: Response) {
    try {
      const profiles = await prisma.faceProfile.findMany({
        include: {
          _count: {
            select: { embeddings: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        success: true,
        data: profiles,
      });
    } catch (error) {
      console.error('List profiles error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list profiles',
      });
    }
  }

  // Get profile by ID with embeddings
  async get(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const profile = await prisma.faceProfile.findUnique({
        where: { id },
        include: {
          embeddings: {
            select: {
              id: true,
              imagePath: true,
              confidence: true,
              modelName: true,
              createdAt: true,
            },
          },
        },
      });

      if (!profile) {
        return res.status(404).json({ success: false, error: 'Profile not found' });
      }

      return res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get profile',
      });
    }
  }

  // Delete profile (cascades to embeddings)
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.faceProfile.delete({
        where: { id },
      });

      return res.json({
        success: true,
        message: 'Profile deleted successfully',
      });
    } catch (error) {
      console.error('Delete profile error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete profile',
      });
    }
  }

  // Add additional embedding to existing profile
  async addEmbedding(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const file = req.file;

      console.log(`\n[ADD EMBEDDING] Adding new face to profile ${id}`);

      if (!file) {
        return res.status(400).json({ success: false, error: 'No image file provided' });
      }

      const profile = await prisma.faceProfile.findUnique({ where: { id } });
      if (!profile) {
        return res.status(404).json({ success: false, error: 'Profile not found' });
      }

      console.log(`[ADD EMBEDDING] Sending to Python backend...`);
      const embeddingResult = await pythonClient.getEmbeddings(file.buffer, file.originalname);

      if (!embeddingResult.success || !embeddingResult.embeddings?.length) {
        return res.status(400).json({
          success: false,
          error: embeddingResult.error || 'No face detected in image',
        });
      }

      const embData = embeddingResult.embeddings[0];
      console.log(`[ADD EMBEDDING] Face detected, storing...`);

      const embedding = await prisma.faceEmbedding.create({
        data: {
          profileId: id,
          embedding: embData.embedding,
          confidence: embData.confidence,
          modelName: embeddingResult.model,
        },
      });

      console.log(`[ADD EMBEDDING] Complete - Embedding ID: ${embedding.id}`);

      return res.status(201).json({
        success: true,
        data: {
          id: embedding.id,
          profileId: embedding.profileId,
          confidence: embedding.confidence,
          modelName: embedding.modelName,
          createdAt: embedding.createdAt,
        },
      });
    } catch (error) {
      console.error('Add embedding error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add embedding',
      });
    }
  }

  // Delete specific embedding
  async deleteEmbedding(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.faceEmbedding.delete({
        where: { id },
      });

      return res.json({
        success: true,
        message: 'Embedding deleted successfully',
      });
    } catch (error) {
      console.error('Delete embedding error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete embedding',
      });
    }
  }

  // Update profile (name, username, phone, address, avatar, dietary preferences, password)
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        name,
        username,
        phone,
        password,
        addressStreet,
        addressCity,
        addressState,
        addressPincode,
        addressLandmark,
        dietaryPreference,
        hideNonVeg,
        religion,
      } = req.body;
      const file = req.file; // Avatar image

      // Check if profile exists
      const existingProfile = await prisma.faceProfile.findUnique({
        where: { id },
      });

      if (!existingProfile) {
        return res.status(404).json({
          success: false,
          error: 'Profile not found',
        });
      }

      // Check if username is unique (if provided and changed)
      if (username && username !== existingProfile.username) {
        const usernameExists = await prisma.faceProfile.findUnique({
          where: { username },
        });
        if (usernameExists) {
          return res.status(400).json({
            success: false,
            error: 'Username is already taken',
          });
        }
      }

      // Handle avatar upload
      let avatarUrl = existingProfile.avatarUrl;
      let avatarId = existingProfile.avatarId;

      if (file) {
        // Delete old avatar if exists
        if (existingProfile.avatarId) {
          await cloudinaryService.deleteImage(existingProfile.avatarId);
        }

        // Upload new avatar
        const uploadResult = await cloudinaryService.uploadImage(
          file.buffer,
          file.originalname,
          'ai-dashboard/avatars'
        );

        if (uploadResult.success) {
          avatarUrl = uploadResult.url!;
          avatarId = uploadResult.publicId!;
        }
      }

      // Build update data
      const updateData: any = {};

      if (name !== undefined) updateData.name = name;
      if (username !== undefined) updateData.username = username || null;
      if (phone !== undefined) updateData.phone = phone || null;
      if (password !== undefined) updateData.password = password || null;
      if (addressStreet !== undefined) updateData.addressStreet = addressStreet || null;
      if (addressCity !== undefined) updateData.addressCity = addressCity || null;
      if (addressState !== undefined) updateData.addressState = addressState || null;
      if (addressPincode !== undefined) updateData.addressPincode = addressPincode || null;
      if (addressLandmark !== undefined) updateData.addressLandmark = addressLandmark || null;
      if (dietaryPreference !== undefined) updateData.dietaryPreference = dietaryPreference || 'none';
      if (hideNonVeg !== undefined) updateData.hideNonVeg = hideNonVeg === true || hideNonVeg === 'true';
      if (religion !== undefined) updateData.religion = religion || null;
      if (avatarUrl !== existingProfile.avatarUrl) {
        updateData.avatarUrl = avatarUrl;
        updateData.avatarId = avatarId;
      }

      // Update profile
      const updatedProfile = await prisma.faceProfile.update({
        where: { id },
        data: updateData,
      });

      return res.json({
        success: true,
        data: {
          id: updatedProfile.id,
          name: updatedProfile.name,
          email: updatedProfile.email,
          username: updatedProfile.username,
          phone: updatedProfile.phone,
          avatarUrl: updatedProfile.avatarUrl,
          totalPoints: updatedProfile.totalPoints,
          addressStreet: updatedProfile.addressStreet,
          addressCity: updatedProfile.addressCity,
          addressState: updatedProfile.addressState,
          addressPincode: updatedProfile.addressPincode,
          addressLandmark: updatedProfile.addressLandmark,
          dietaryPreference: updatedProfile.dietaryPreference,
          hideNonVeg: updatedProfile.hideNonVeg,
          religion: updatedProfile.religion,
          createdAt: updatedProfile.createdAt,
          updatedAt: updatedProfile.updatedAt,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
      });
    }
  }

  // Remove avatar from profile
  async removeAvatar(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const profile = await prisma.faceProfile.findUnique({
        where: { id },
      });

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'Profile not found',
        });
      }

      // Delete avatar from Cloudinary
      if (profile.avatarId) {
        await cloudinaryService.deleteImage(profile.avatarId);
      }

      // Update profile
      const updatedProfile = await prisma.faceProfile.update({
        where: { id },
        data: {
          avatarUrl: null,
          avatarId: null,
        },
      });

      return res.json({
        success: true,
        data: updatedProfile,
      });
    } catch (error) {
      console.error('Remove avatar error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove avatar',
      });
    }
  }
}

export const profileController = new ProfileController();
