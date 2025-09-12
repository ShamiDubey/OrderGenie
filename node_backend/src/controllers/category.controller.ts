import { Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { cloudinaryService } from '../services/cloudinary';
import { generateSlug } from '../utils/slug';

export class CategoryController {
  // List all categories (Public)
  async list(req: Request, res: Response) {
    try {
      const { active } = req.query;

      const where = active !== undefined ? { isActive: active === 'true' } : {};

      const categories = await prisma.category.findMany({
        where,
        include: {
          _count: { select: { products: true } },
        },
        orderBy: { displayOrder: 'asc' },
      });

      return res.json({ success: true, data: categories });
    } catch (error) {
      console.error('List categories error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list categories',
      });
    }
  }

  // Get category by ID (Public)
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: { select: { products: true } },
        },
      });

      if (!category) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }

      return res.json({ success: true, data: category });
    } catch (error) {
      console.error('Get category error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get category',
      });
    }
  }

  // Get category by slug (Public)
  async getBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;

      const category = await prisma.category.findUnique({
        where: { slug },
        include: {
          _count: { select: { products: true } },
        },
      });

      if (!category) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }

      return res.json({ success: true, data: category });
    } catch (error) {
      console.error('Get category by slug error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get category',
      });
    }
  }

  // Get products in category (Public)
  async getProducts(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const products = await prisma.product.findMany({
        where: {
          categoryId: id,
          isAvailable: true,
        },
        orderBy: { displayOrder: 'asc' },
      });

      return res.json({ success: true, data: products });
    } catch (error) {
      console.error('Get category products error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get products',
      });
    }
  }

  // Get products by category slug (Public)
  async getProductsBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;

      // First find the category by slug
      const category = await prisma.category.findUnique({
        where: { slug },
      });

      if (!category) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }

      const products = await prisma.product.findMany({
        where: {
          categoryId: category.id,
          isAvailable: true,
        },
        orderBy: { displayOrder: 'asc' },
      });

      return res.json({ success: true, data: products });
    } catch (error) {
      console.error('Get category products by slug error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get products',
      });
    }
  }

  // Create category (Admin)
  async create(req: Request, res: Response) {
    try {
      const { name, description, displayOrder, isActive, modifiers } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'Name is required' });
      }

      // Generate unique slug
      const baseSlug = generateSlug(name);
      let slug = baseSlug;
      let counter = 1;

      while (await prisma.category.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Handle image upload
      let imageUrl: string | null = null;
      if (req.file) {
        const uploadResult = await cloudinaryService.uploadImage(
          req.file.buffer,
          req.file.originalname,
          'ai-dashboard/categories'
        );
        if (uploadResult.success) {
          imageUrl = uploadResult.url!;
        }
      }

      // Parse modifiers if provided as string
      let parsedModifiers = [];
      if (modifiers) {
        try {
          parsedModifiers = typeof modifiers === 'string' ? JSON.parse(modifiers) : modifiers;
        } catch {
          parsedModifiers = [];
        }
      }

      const category = await prisma.category.create({
        data: {
          name,
          slug,
          description: description || null,
          imageUrl,
          displayOrder: displayOrder ? parseInt(displayOrder, 10) : 0,
          isActive: isActive !== 'false' && isActive !== false,
          modifiers: parsedModifiers,
        },
      });

      return res.status(201).json({ success: true, data: category });
    } catch (error) {
      console.error('Create category error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create category',
      });
    }
  }

  // Update category (Admin)
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, displayOrder, isActive, modifiers } = req.body;

      const existing = await prisma.category.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }

      // Handle slug update if name changed
      let slug = existing.slug;
      if (name && name !== existing.name) {
        const baseSlug = generateSlug(name);
        slug = baseSlug;
        let counter = 1;

        while (true) {
          const found = await prisma.category.findUnique({ where: { slug } });
          if (!found || found.id === id) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
      }

      // Handle image upload
      let imageUrl = existing.imageUrl;
      if (req.file) {
        const uploadResult = await cloudinaryService.uploadImage(
          req.file.buffer,
          req.file.originalname,
          'ai-dashboard/categories'
        );
        if (uploadResult.success) {
          imageUrl = uploadResult.url!;
        }
      }

      // Parse modifiers if provided
      let parsedModifiers = undefined;
      if (modifiers !== undefined) {
        try {
          parsedModifiers = typeof modifiers === 'string' ? JSON.parse(modifiers) : modifiers;
        } catch {
          parsedModifiers = [];
        }
      }

      const category = await prisma.category.update({
        where: { id },
        data: {
          ...(name && { name, slug }),
          ...(description !== undefined && { description }),
          ...(imageUrl && { imageUrl }),
          ...(displayOrder !== undefined && { displayOrder: parseInt(displayOrder, 10) }),
          ...(isActive !== undefined && { isActive: isActive === 'true' || isActive === true }),
          ...(parsedModifiers !== undefined && { modifiers: parsedModifiers }),
        },
      });

      return res.json({ success: true, data: category });
    } catch (error) {
      console.error('Update category error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update category',
      });
    }
  }

  // Delete category (Admin)
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.category.delete({ where: { id } });

      return res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Delete category error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete category',
      });
    }
  }
}

export const categoryController = new CategoryController();
