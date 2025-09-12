import { Request, Response } from 'express';
import { pythonClient } from '../services/python-client';
import { prisma } from '../services/prisma';
import { config } from '../config';

export class FaceController {
  // Detect faces in an image
  async detect(req: Request, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'No image file provided' });
      }

      const startTime = Date.now();
      const result = await pythonClient.detectFaces(file.buffer, file.originalname);
      const processingTime = Date.now() - startTime;

      // Log detection
      await prisma.detectionLog.create({
        data: {
          facesDetected: result.faces_count || 0,
          processingTimeMs: processingTime,
        },
      });

      return res.json({
        success: true,
        data: {
          ...result,
          processingTimeMs: processingTime,
        },
      });
    } catch (error) {
      console.error('Face detection error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Face detection failed',
      });
    }
  }

  // Recognize face against registered profiles
  async recognize(req: Request, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'No image file provided' });
      }

      const startTime = Date.now();

      const embeddingResult = await pythonClient.getEmbeddings(file.buffer, file.originalname);

      if (!embeddingResult.success || !embeddingResult.embeddings?.length) {
        return res.status(400).json({
          success: false,
          error: embeddingResult.error || 'No face detected in image',
        });
      }

      const inputEmbedding = embeddingResult.embeddings[0].embedding;

      // Get all embeddings from database
      const allEmbeddings = await prisma.faceEmbedding.findMany({
        include: {
          profile: true,
        },
      });

      // Calculate cosine similarity for each
      const allMatches = allEmbeddings
        .map((dbEmb) => {
          const distance = cosineSimilarity(inputEmbedding, dbEmb.embedding);
          return {
            profileId: dbEmb.profileId,
            embeddingId: dbEmb.id,
            name: dbEmb.profile.name,
            email: dbEmb.profile.email,
            username: dbEmb.profile.username,
            phone: dbEmb.profile.phone,
            totalPoints: dbEmb.profile.totalPoints,
            avatarUrl: dbEmb.profile.avatarUrl,
            dietaryPreference: dbEmb.profile.dietaryPreference,
            hideNonVeg: dbEmb.profile.hideNonVeg,
            religion: dbEmb.profile.religion,
            distance,
            similarity: 1 - distance,
          };
        })
        .sort((a, b) => a.distance - b.distance);

      // Filter matches based on thresholds from config
      const filteredMatches = allMatches.filter(
        (m) => m.distance <= config.faceMaxDistance && m.similarity >= config.faceMinSimilarity
      );

      const processingTime = (Date.now() - startTime) / 1000;

      console.log(`\n[RECOGNIZE] Found ${allMatches.length} total, ${filteredMatches.length} passed thresholds`);
      console.log(`[RECOGNIZE] Thresholds: maxDistance=${config.faceMaxDistance}, minSimilarity=${config.faceMinSimilarity}`);

      // Log detection with best match
      const bestMatch = filteredMatches[0];
      if (bestMatch) {
        await prisma.detectionLog.create({
          data: {
            facesDetected: 1,
            matchedProfileId: bestMatch.profileId,
            matchedEmbeddingId: bestMatch.embeddingId,
            distance: bestMatch.distance,
            processingTimeMs: processingTime,
          },
        });
      }

      return res.json({
        success: true,
        data: {
          matches: filteredMatches,
          processingTimeS: processingTime,
          thresholds: {
            maxDistance: config.faceMaxDistance,
            minSimilarity: config.faceMinSimilarity,
          },
        },
      });
    } catch (error) {
      console.error('Face recognition error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Face recognition failed',
      });
    }
  }
}

// Cosine distance calculation
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return 1 - similarity; // Convert to distance (0 = identical)
}

export const faceController = new FaceController();
