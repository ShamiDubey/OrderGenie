import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config';

// Configure Cloudinary
if (config.cloudinaryUrl) {
  cloudinary.config({
    url: config.cloudinaryUrl,
  });
}

export interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  thumbnailUrl?: string;
  error?: string;
}

class CloudinaryService {
  private folder = 'ai-dashboard/products';

  async uploadImage(
    buffer: Buffer,
    filename: string,
    folder?: string
  ): Promise<UploadResult> {
    try {
      if (!config.cloudinaryUrl) {
        return { success: false, error: 'Cloudinary not configured' };
      }

      const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;

      const result = await cloudinary.uploader.upload(base64Image, {
        folder: folder || this.folder,
        public_id: `${Date.now()}-${filename.split('.')[0]}`,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
        ],
      });

      // Generate thumbnail URL
      const thumbnailUrl = cloudinary.url(result.public_id, {
        width: 300,
        height: 300,
        crop: 'fill',
        quality: 'auto:low',
        format: 'webp',
      });

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        thumbnailUrl,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  async deleteImage(publicId: string): Promise<boolean> {
    try {
      if (!config.cloudinaryUrl) return false;
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return false;
    }
  }
}

export const cloudinaryService = new CloudinaryService();
