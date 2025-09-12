import { Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { cloudinaryService } from '../services/cloudinary';
import { generateSlug } from '../utils/slug';
import { calculateEffectivePrice, isDiscountActive } from '../utils/discount';
import { Prisma } from '@prisma/client';

export class ProductController {
  // List products with filters (Public)
  async list(req: Request, res: Response) {
    try {
      const {
        category,
        isVeg,
        tags,
        search,
        available,
        featured,
        page = '1',
        limit = '20',
        sortBy = 'displayOrder',
        sortOrder = 'asc',
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: Prisma.ProductWhereInput = {};

      // Handle availability filter: 'all' = show all, 'true' = available only, 'false' = unavailable only
      // Default to showing only available products for public API
      if (available === 'all') {
        // Don't filter by availability - show all products (for admin)
      } else if (available !== undefined) {
        where.isAvailable = available === 'true';
      } else {
        where.isAvailable = true; // Default: only available products
      }

      if (category) where.categoryId = category as string;
      if (isVeg !== undefined) where.isVeg = isVeg === 'true';
      if (featured !== undefined) where.isFeatured = featured === 'true';

      if (tags) {
        const tagArray = (tags as string).split(',').map((t) => t.trim());
        where.tags = { hasSome: tagArray };
      }

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      // Sort
      const validSortFields = ['displayOrder', 'name', 'price', 'createdAt'];
      const orderField = validSortFields.includes(sortBy as string) ? sortBy : 'displayOrder';
      const orderDir = sortOrder === 'desc' ? 'desc' : 'asc';

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { [orderField as string]: orderDir },
          skip,
          take: limitNum,
        }),
        prisma.product.count({ where }),
      ]);

      // Transform products
      const transformedProducts = products.map((product) => ({
        ...product,
        effectivePrice: calculateEffectivePrice(product),
        hasActiveDiscount: isDiscountActive(product),
        price: product.price.toString(),
        discountedPrice: product.discountedPrice?.toString() || null,
      }));

      return res.json({
        success: true,
        data: transformedProducts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error('List products error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list products',
      });
    }
  }

  // Get featured products (Public)
  async getFeatured(req: Request, res: Response) {
    try {
      const limit = Math.min(20, parseInt((req.query.limit as string) || '10', 10));

      const products = await prisma.product.findMany({
        where: { isFeatured: true, isAvailable: true },
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { displayOrder: 'asc' },
        take: limit,
      });

      const transformed = products.map((p) => ({
        ...p,
        effectivePrice: calculateEffectivePrice(p),
        hasActiveDiscount: isDiscountActive(p),
        price: p.price.toString(),
        discountedPrice: p.discountedPrice?.toString() || null,
      }));

      return res.json({ success: true, data: transformed });
    } catch (error) {
      console.error('Get featured error:', error);
      return res.status(500).json({ success: false, error: 'Failed to get featured products' });
    }
  }

  // Get by ID (Public)
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      return res.json({
        success: true,
        data: {
          ...product,
          effectivePrice: calculateEffectivePrice(product),
          hasActiveDiscount: isDiscountActive(product),
          price: product.price.toString(),
          discountedPrice: product.discountedPrice?.toString() || null,
        },
      });
    } catch (error) {
      console.error('Get product error:', error);
      return res.status(500).json({ success: false, error: 'Failed to get product' });
    }
  }

  // Get by slug (Public)
  async getBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;

      const product = await prisma.product.findUnique({
        where: { slug },
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      return res.json({
        success: true,
        data: {
          ...product,
          effectivePrice: calculateEffectivePrice(product),
          hasActiveDiscount: isDiscountActive(product),
          price: product.price.toString(),
          discountedPrice: product.discountedPrice?.toString() || null,
        },
      });
    } catch (error) {
      console.error('Get product by slug error:', error);
      return res.status(500).json({ success: false, error: 'Failed to get product' });
    }
  }

  // Create product (Admin)
  async create(req: Request, res: Response) {
    try {
      const {
        name,
        description,
        price,
        discountedPrice,
        discountEnds,
        isVeg,
        tags,
        categoryId,
        preparationTime,
        calories,
        servingSize,
        isAvailable,
        isFeatured,
        displayOrder,
        royaltyPoints,
      } = req.body;

      // Validation
      if (!name || !price) {
        return res.status(400).json({ success: false, error: 'Name and price are required' });
      }

      // Generate unique slug
      const baseSlug = generateSlug(name);
      let slug = baseSlug;
      let counter = 1;

      while (await prisma.product.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Handle image upload
      let imageUrl: string | null = null;
      let imagePublicId: string | null = null;
      let thumbnailUrl: string | null = null;

      if (req.file) {
        const uploadResult = await cloudinaryService.uploadImage(req.file.buffer, req.file.originalname);
        if (uploadResult.success) {
          imageUrl = uploadResult.url!;
          imagePublicId = uploadResult.publicId!;
          thumbnailUrl = uploadResult.thumbnailUrl!;
        }
      }

      // Parse tags
      const parsedTags =
        typeof tags === 'string'
          ? tags.split(',').map((t) => t.trim()).filter(Boolean)
          : Array.isArray(tags)
          ? tags
          : [];

      const product = await prisma.product.create({
        data: {
          name,
          slug,
          description: description || null,
          price: parseFloat(price),
          discountedPrice: discountedPrice ? parseFloat(discountedPrice) : null,
          discountEnds: discountEnds ? new Date(discountEnds) : null,
          isVeg: isVeg === 'true' || isVeg === true,
          tags: parsedTags,
          categoryId: categoryId || null,
          imageUrl,
          imagePublicId,
          thumbnailUrl,
          preparationTime: preparationTime ? parseInt(preparationTime, 10) : null,
          calories: calories ? parseInt(calories, 10) : null,
          servingSize: servingSize || null,
          isAvailable: isAvailable !== 'false' && isAvailable !== false,
          isFeatured: isFeatured === 'true' || isFeatured === true,
          displayOrder: displayOrder ? parseInt(displayOrder, 10) : 0,
          royaltyPoints: royaltyPoints ? parseInt(royaltyPoints, 10) : 50,
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      return res.status(201).json({
        success: true,
        data: {
          ...product,
          price: product.price.toString(),
          discountedPrice: product.discountedPrice?.toString() || null,
        },
      });
    } catch (error) {
      console.error('Create product error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create product',
      });
    }
  }

  // Update product (Admin)
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      // Handle image update
      if (req.file) {
        if (existing.imagePublicId) {
          await cloudinaryService.deleteImage(existing.imagePublicId);
        }

        const uploadResult = await cloudinaryService.uploadImage(req.file.buffer, req.file.originalname);
        if (uploadResult.success) {
          updateData.imageUrl = uploadResult.url;
          updateData.imagePublicId = uploadResult.publicId;
          updateData.thumbnailUrl = uploadResult.thumbnailUrl;
        }
      }

      // Handle slug update
      if (updateData.name && updateData.name !== existing.name) {
        const baseSlug = generateSlug(updateData.name);
        let slug = baseSlug;
        let counter = 1;

        while (true) {
          const found = await prisma.product.findUnique({ where: { slug } });
          if (!found || found.id === id) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        updateData.slug = slug;
      }

      // Build update data
      const data: Prisma.ProductUpdateInput = {};

      if (updateData.name) data.name = updateData.name;
      if (updateData.slug) data.slug = updateData.slug;
      if (updateData.description !== undefined) data.description = updateData.description;
      if (updateData.price) data.price = parseFloat(updateData.price);
      if (updateData.discountedPrice !== undefined) {
        data.discountedPrice = updateData.discountedPrice ? parseFloat(updateData.discountedPrice) : null;
      }
      if (updateData.discountEnds !== undefined) {
        data.discountEnds = updateData.discountEnds ? new Date(updateData.discountEnds) : null;
      }
      if (updateData.isVeg !== undefined) data.isVeg = updateData.isVeg === 'true' || updateData.isVeg === true;
      if (updateData.tags) {
        data.tags =
          typeof updateData.tags === 'string'
            ? updateData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
            : updateData.tags;
      }
      if (updateData.categoryId !== undefined) {
        if (updateData.categoryId) {
          data.category = { connect: { id: updateData.categoryId } };
        } else {
          data.category = { disconnect: true };
        }
      }
      if (updateData.imageUrl) data.imageUrl = updateData.imageUrl;
      if (updateData.imagePublicId) data.imagePublicId = updateData.imagePublicId;
      if (updateData.thumbnailUrl) data.thumbnailUrl = updateData.thumbnailUrl;
      if (updateData.preparationTime !== undefined) {
        data.preparationTime = updateData.preparationTime ? parseInt(updateData.preparationTime, 10) : null;
      }
      if (updateData.calories !== undefined) {
        data.calories = updateData.calories ? parseInt(updateData.calories, 10) : null;
      }
      if (updateData.servingSize !== undefined) data.servingSize = updateData.servingSize || null;
      if (updateData.isAvailable !== undefined) {
        data.isAvailable = updateData.isAvailable === 'true' || updateData.isAvailable === true;
      }
      if (updateData.isFeatured !== undefined) {
        data.isFeatured = updateData.isFeatured === 'true' || updateData.isFeatured === true;
      }
      if (updateData.displayOrder !== undefined) {
        data.displayOrder = parseInt(updateData.displayOrder, 10);
      }
      if (updateData.royaltyPoints !== undefined) {
        data.royaltyPoints = parseInt(updateData.royaltyPoints, 10);
      }

      const product = await prisma.product.update({
        where: { id },
        data,
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      return res.json({
        success: true,
        data: {
          ...product,
          price: product.price.toString(),
          discountedPrice: product.discountedPrice?.toString() || null,
        },
      });
    } catch (error) {
      console.error('Update product error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update product',
      });
    }
  }

  // Toggle availability (Admin)
  async toggleAvailability(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { isAvailable } = req.body;

      const product = await prisma.product.update({
        where: { id },
        data: { isAvailable: isAvailable === true || isAvailable === 'true' },
      });

      return res.json({
        success: true,
        data: { id: product.id, isAvailable: product.isAvailable },
      });
    } catch (error) {
      console.error('Toggle availability error:', error);
      return res.status(500).json({ success: false, error: 'Failed to update availability' });
    }
  }

  // Delete product (Admin)
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      // Delete image from Cloudinary
      if (product.imagePublicId) {
        await cloudinaryService.deleteImage(product.imagePublicId);
      }

      await prisma.product.delete({ where: { id } });

      return res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Delete product error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete product',
      });
    }
  }
}

export const productController = new ProductController();
