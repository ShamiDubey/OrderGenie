import { Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { OrderStatus, PaymentMethod, OrderType, Prisma } from '@prisma/client';
import { generateOrderNumber, transformOrderForResponse } from '../utils/order';
import { calculateEffectivePrice, isDiscountActive } from '../utils/discount';
import { recommendationService } from '../services/recommendation.service';
import { pointsService } from '../services/points.service';

interface OrderItemInput {
  productId: string;
  quantity: number;
}

interface CreateOrderInput {
  profileId?: string;
  employeeId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  orderType?: OrderType;
  paymentMethod?: PaymentMethod;
  notes?: string;
  items: OrderItemInput[];
}

export class OrderController {
  /**
   * Create a new order
   * POST /api/orders
   */
  async create(req: Request, res: Response) {
    try {
      const {
        profileId,
        employeeId,
        customerName,
        customerEmail,
        customerPhone,
        orderType,
        paymentMethod,
        notes,
        items,
      }: CreateOrderInput = req.body;

      // Validation
      if (!customerName) {
        return res.status(400).json({
          success: false,
          error: 'Customer name is required',
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one item is required',
        });
      }

      // Validate all items have productId and positive quantity
      for (const item of items) {
        if (!item.productId) {
          return res.status(400).json({
            success: false,
            error: 'Each item must have a productId',
          });
        }
        if (!item.quantity || item.quantity < 1) {
          return res.status(400).json({
            success: false,
            error: 'Each item must have a quantity of at least 1',
          });
        }
      }

      // Fetch all products in single query
      const productIds = items.map((item) => item.productId);
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
        },
        include: {
          category: {
            select: { name: true },
          },
        },
      });

      // Validate all products exist
      if (products.length !== productIds.length) {
        const foundIds = products.map((p) => p.id);
        const missingIds = productIds.filter((id) => !foundIds.includes(id));
        return res.status(400).json({
          success: false,
          error: `Products not found: ${missingIds.join(', ')}`,
        });
      }

      // Check availability
      const unavailableProducts = products.filter((p) => !p.isAvailable);
      if (unavailableProducts.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Products unavailable: ${unavailableProducts.map((p) => p.name).join(', ')}`,
        });
      }

      // Validate profileId if provided
      if (profileId) {
        const profile = await prisma.faceProfile.findUnique({
          where: { id: profileId },
        });
        if (!profile) {
          return res.status(400).json({
            success: false,
            error: 'Profile not found',
          });
        }
      }

      // Create product lookup map
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Calculate pricing for each item
      let subtotal = 0;
      let discountTotal = 0;

      const orderItemsData = items.map((item) => {
        const product = productMap.get(item.productId)!;
        const unitPrice = Number(product.price);
        const discountedPrice = product.discountedPrice ? Number(product.discountedPrice) : null;
        const effectivePrice = Number(calculateEffectivePrice(product));
        const hasDiscount = isDiscountActive(product);

        const lineTotal = effectivePrice * item.quantity;
        subtotal += lineTotal;

        if (hasDiscount && discountedPrice !== null) {
          discountTotal += (unitPrice - effectivePrice) * item.quantity;
        }

        return {
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          quantity: item.quantity,
          unitPrice,
          discountedPrice: hasDiscount ? discountedPrice : null,
          effectivePrice,
          lineTotal,
          isVeg: product.isVeg,
          categoryName: product.category?.name || null,
          royaltyPoints: product.royaltyPoints || 50, // Default to 50 if not set
        };
      });

      const grandTotal = subtotal; // Can add tax calculation here if needed

      // Generate order number
      const orderNumber = await generateOrderNumber();

      // Create order with items in transaction
      const order = await prisma.$transaction(async (tx) => {
        const createdOrder = await tx.order.create({
          data: {
            orderNumber,
            profileId: profileId || null,
            employeeId: employeeId || null,
            customerName,
            customerEmail: customerEmail || null,
            customerPhone: customerPhone || null,
            orderType: orderType || 'DINE_IN',
            paymentMethod: paymentMethod || null,
            notes: notes || null,
            status: 'PENDING',
            subtotal,
            discountTotal,
            taxAmount: 0,
            grandTotal,
            items: {
              create: orderItemsData,
            },
          },
          include: {
            items: true,
            profile: {
              select: { id: true, name: true, email: true, totalPoints: true },
            },
          },
        });

        return createdOrder;
      });

      // Calculate points earned
      const pointsEarned = orderItemsData.reduce(
        (sum, item) => sum + (item.royaltyPoints * item.quantity),
        0
      );

      console.log(`[ORDER] Order ${order.orderNumber} created. profileId: ${profileId}, pointsEarned: ${pointsEarned}`);
      console.log(`[ORDER] Order items royalty points:`, orderItemsData.map(i => ({ name: i.productName, qty: i.quantity, pts: i.royaltyPoints })));

      // Credit royalty points immediately on order creation (synchronous for reliability)
      if (profileId && pointsEarned > 0) {
        console.log(`[ORDER] Calling pointsService.creditOrderPoints...`);
        try {
          await pointsService.creditOrderPoints(order.id, profileId);
          console.log(`[ORDER] Successfully credited ${pointsEarned} points for order ${order.orderNumber}`);
        } catch (error) {
          console.error('[ORDER] Failed to credit points:', error);
          // Don't fail the order, just log the error
        }
      } else {
        console.log(`[ORDER] Skipping points credit: profileId=${profileId}, pointsEarned=${pointsEarned}`);
      }

      // Update recommendations in background (non-blocking)
      if (profileId) {
        setImmediate(async () => {
          try {
            await recommendationService.updatePreferencesAfterOrder(profileId);
            console.log(`Updated preferences for profile ${profileId} after order ${order.orderNumber}`);
          } catch (error) {
            console.error('Failed to update preferences after order:', error);
          }
        });
      }

      return res.status(201).json({
        success: true,
        data: {
          ...transformOrderForResponse(order),
          pointsEarned: profileId ? pointsEarned : 0,
        },
      });
    } catch (error) {
      console.error('Create order error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      });
    }
  }

  /**
   * Get order by ID
   * GET /api/orders/:id
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: true,
          profile: {
            select: { id: true, name: true, email: true, totalPoints: true },
          },
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      return res.json({
        success: true,
        data: transformOrderForResponse(order),
      });
    } catch (error) {
      console.error('Get order error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get order',
      });
    }
  }

  /**
   * Get order by order number
   * GET /api/orders/number/:orderNumber
   */
  async getByOrderNumber(req: Request, res: Response) {
    try {
      const { orderNumber } = req.params;

      const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: {
          items: true,
          profile: {
            select: { id: true, name: true, email: true, totalPoints: true },
          },
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      return res.json({
        success: true,
        data: transformOrderForResponse(order),
      });
    } catch (error) {
      console.error('Get order by number error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get order',
      });
    }
  }

  /**
   * Get orders by profile ID (order history)
   * GET /api/orders/profile/:profileId
   */
  async getByProfile(req: Request, res: Response) {
    try {
      const { profileId } = req.params;
      const { page = '1', limit = '20' } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
      const skip = (pageNum - 1) * limitNum;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { profileId },
          include: {
            items: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.order.count({ where: { profileId } }),
      ]);

      return res.json({
        success: true,
        data: orders.map(transformOrderForResponse),
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
      console.error('Get orders by profile error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get orders',
      });
    }
  }

  /**
   * Cancel order (only if PENDING)
   * PATCH /api/orders/:id/cancel
   */
  async cancel(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const order = await prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      if (order.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          error: `Cannot cancel order with status: ${order.status}`,
        });
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
        include: {
          items: true,
          profile: {
            select: { id: true, name: true, email: true, totalPoints: true },
          },
        },
      });

      // Deduct points if order was linked to a profile
      if (updatedOrder.profileId) {
        setImmediate(async () => {
          try {
            await pointsService.deductOrderPoints(id, updatedOrder.profileId!);
            console.log(`Deducted points for cancelled order ${updatedOrder.orderNumber}`);
          } catch (error) {
            console.error('Failed to deduct points:', error);
          }
        });
      }

      return res.json({
        success: true,
        data: transformOrderForResponse(updatedOrder),
      });
    } catch (error) {
      console.error('Cancel order error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to cancel order',
      });
    }
  }

  /**
   * List all orders (Admin)
   * GET /api/orders
   */
  async list(req: Request, res: Response) {
    try {
      const {
        status,
        profileId,
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: Prisma.OrderWhereInput = {};

      if (status) {
        where.status = status as OrderStatus;
      }

      if (profileId) {
        where.profileId = profileId as string;
      }

      // Sort
      const validSortFields = ['createdAt', 'grandTotal', 'status', 'orderNumber'];
      const orderField = validSortFields.includes(sortBy as string) ? sortBy : 'createdAt';
      const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            items: true,
            profile: {
              select: { id: true, name: true, email: true, totalPoints: true },
            },
          },
          orderBy: { [orderField as string]: orderDir },
          skip,
          take: limitNum,
        }),
        prisma.order.count({ where }),
      ]);

      return res.json({
        success: true,
        data: orders.map(transformOrderForResponse),
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
      console.error('List orders error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to list orders',
      });
    }
  }

  /**
   * Update order status (Admin)
   * PATCH /api/orders/:id/status
   */
  async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required',
        });
      }

      const validStatuses: OrderStatus[] = [
        'PENDING',
        'CONFIRMED',
        'PREPARING',
        'READY',
        'COMPLETED',
        'CANCELLED',
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Valid values: ${validStatuses.join(', ')}`,
        });
      }

      const order = await prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      // Update timestamps based on status
      const updateData: Prisma.OrderUpdateInput = {
        status,
      };

      if (status === 'CONFIRMED' && !order.confirmedAt) {
        updateData.confirmedAt = new Date();
      } else if (status === 'COMPLETED' && !order.completedAt) {
        updateData.completedAt = new Date();
      } else if (status === 'CANCELLED' && !order.cancelledAt) {
        updateData.cancelledAt = new Date();
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: updateData,
        include: {
          items: true,
          profile: {
            select: { id: true, name: true, email: true, totalPoints: true },
          },
        },
      });

      // Deduct points when order is cancelled (points were credited on order creation)
      if (status === 'CANCELLED' && updatedOrder.profileId) {
        setImmediate(async () => {
          try {
            await pointsService.deductOrderPoints(id, updatedOrder.profileId!);
            console.log(`Deducted points for cancelled order ${updatedOrder.orderNumber}`);
          } catch (error) {
            console.error('Failed to deduct points:', error);
          }
        });
      }

      return res.json({
        success: true,
        data: transformOrderForResponse(updatedOrder),
      });
    } catch (error) {
      console.error('Update order status error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update order status',
      });
    }
  }

  /**
   * Get most ordered products (Analytics - Admin)
   * GET /api/orders/analytics/top-products
   */
  async getTopProducts(req: Request, res: Response) {
    try {
      const { limit = '10' } = req.query;
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));

      // Aggregate order items by product
      const topProducts = await prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        _sum: {
          quantity: true,
          lineTotal: true,
        },
        _count: {
          orderId: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: limitNum,
      });

      const result = topProducts.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        totalOrdered: item._sum.quantity || 0,
        orderCount: item._count.orderId,
        totalRevenue: item._sum.lineTotal?.toString() || '0',
      }));

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Get top products error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get top products',
      });
    }
  }

  /**
   * Get profile's most ordered products (Analytics - for recommendations)
   * GET /api/orders/analytics/profile/:profileId
   */
  async getProfileTopProducts(req: Request, res: Response) {
    try {
      const { profileId } = req.params;
      const { limit = '10' } = req.query;
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));

      // First get all order IDs for this profile
      const profileOrders = await prisma.order.findMany({
        where: { profileId },
        select: { id: true },
      });

      if (profileOrders.length === 0) {
        return res.json({
          success: true,
          data: [],
        });
      }

      const orderIds = profileOrders.map((o) => o.id);

      // Aggregate order items for these orders
      const topProducts = await prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: {
          orderId: { in: orderIds },
        },
        _sum: {
          quantity: true,
          lineTotal: true,
        },
        _count: {
          orderId: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: limitNum,
      });

      const result = topProducts.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        totalOrdered: item._sum.quantity || 0,
        orderCount: item._count.orderId,
        totalSpent: item._sum.lineTotal?.toString() || '0',
      }));

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Get profile top products error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get profile top products',
      });
    }
  }
}

export const orderController = new OrderController();
