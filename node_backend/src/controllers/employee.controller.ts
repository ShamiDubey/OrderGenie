import { Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { OrderStatus } from '@prisma/client';
import { cloudinaryService } from '../services/cloudinary';
import { employeeSessionService } from '../services/employee-session.service';
import { recommendationService } from '../services/recommendation.service';
import { pythonClient } from '../services/python-client';
import { pointsService } from '../services/points.service';
import { EmployeeRequest } from '../middleware/employee';
import { transformOrderForResponse } from '../utils/order';

export class EmployeeController {
  // ============================================
  // ADMIN CRUD OPERATIONS
  // ============================================

  /**
   * Create a new employee (Admin only)
   */
  async create(req: Request, res: Response) {
    try {
      const { employeeId, name, pin, dateOfBirth, gender } = req.body;
      const file = req.file;

      // Validation
      if (!employeeId || !name || !pin) {
        return res.status(400).json({
          success: false,
          error: 'Employee ID, name, and PIN are required',
        });
      }

      // Check if employeeId already exists
      const existing = await prisma.employee.findUnique({
        where: { employeeId },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Employee ID already exists',
        });
      }

      // Handle profile image upload
      let profileImageUrl: string | null = null;
      let profileImageId: string | null = null;

      if (file) {
        const uploadResult = await cloudinaryService.uploadImage(
          file.buffer,
          file.originalname,
          'ai-dashboard/employees'
        );
        if (uploadResult.success) {
          profileImageUrl = uploadResult.url!;
          profileImageId = uploadResult.publicId!;
        }
      }

      // Create employee
      const employee = await prisma.employee.create({
        data: {
          employeeId,
          name,
          pin,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender || null,
          profileImageUrl,
          profileImageId,
        },
      });

      // Don't return pin in response
      const { pin: _, ...employeeData } = employee;

      return res.status(201).json({
        success: true,
        data: employeeData,
      });
    } catch (error) {
      console.error('Create employee error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create employee',
      });
    }
  }

  /**
   * List all employees (Admin only)
   */
  async list(req: Request, res: Response) {
    try {
      const { includeInactive = 'false' } = req.query;

      const employees = await prisma.employee.findMany({
        where: includeInactive === 'true' ? {} : { isActive: true },
        select: {
          id: true,
          employeeId: true,
          name: true,
          dateOfBirth: true,
          gender: true,
          profileImageUrl: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: { orders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        success: true,
        data: employees,
      });
    } catch (error) {
      console.error('List employees error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list employees',
      });
    }
  }

  /**
   * Get employee by ID (Admin only)
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const employee = await prisma.employee.findUnique({
        where: { id },
        select: {
          id: true,
          employeeId: true,
          name: true,
          dateOfBirth: true,
          gender: true,
          profileImageUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          _count: {
            select: { orders: true },
          },
        },
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found',
        });
      }

      return res.json({
        success: true,
        data: employee,
      });
    } catch (error) {
      console.error('Get employee error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get employee',
      });
    }
  }

  /**
   * Update employee (Admin only)
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { employeeId, name, pin, dateOfBirth, gender, isActive } = req.body;
      const file = req.file;

      const existing = await prisma.employee.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found',
        });
      }

      // Check if new employeeId conflicts with another employee
      if (employeeId && employeeId !== existing.employeeId) {
        const conflict = await prisma.employee.findUnique({
          where: { employeeId },
        });
        if (conflict) {
          return res.status(400).json({
            success: false,
            error: 'Employee ID already exists',
          });
        }
      }

      // Handle profile image update
      let profileImageUrl = existing.profileImageUrl;
      let profileImageId = existing.profileImageId;

      if (file) {
        // Delete old image if exists
        if (existing.profileImageId) {
          await cloudinaryService.deleteImage(existing.profileImageId);
        }

        const uploadResult = await cloudinaryService.uploadImage(
          file.buffer,
          file.originalname,
          'ai-dashboard/employees'
        );
        if (uploadResult.success) {
          profileImageUrl = uploadResult.url!;
          profileImageId = uploadResult.publicId!;
        }
      }

      // Build update data
      const updateData: any = {
        profileImageUrl,
        profileImageId,
      };

      if (employeeId !== undefined) updateData.employeeId = employeeId;
      if (name !== undefined) updateData.name = name;
      if (pin !== undefined) updateData.pin = pin;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      if (gender !== undefined) updateData.gender = gender || null;
      if (isActive !== undefined) updateData.isActive = isActive;

      const employee = await prisma.employee.update({
        where: { id },
        data: updateData,
      });

      // Don't return pin in response
      const { pin: _, ...employeeData } = employee;

      return res.json({
        success: true,
        data: employeeData,
      });
    } catch (error) {
      console.error('Update employee error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update employee',
      });
    }
  }

  /**
   * Delete/deactivate employee (Admin only)
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const employee = await prisma.employee.findUnique({ where: { id } });
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found',
        });
      }

      // Soft delete - just deactivate
      await prisma.employee.update({
        where: { id },
        data: { isActive: false },
      });

      return res.json({
        success: true,
        message: 'Employee deactivated successfully',
      });
    } catch (error) {
      console.error('Delete employee error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete employee',
      });
    }
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  /**
   * Employee login with ID and PIN
   */
  async login(req: Request, res: Response) {
    try {
      const { employeeId, pin } = req.body;

      if (!employeeId || !pin) {
        return res.status(400).json({
          success: false,
          error: 'Employee ID and PIN are required',
        });
      }

      // Find employee by employeeId
      const employee = await prisma.employee.findUnique({
        where: { employeeId },
      });

      if (!employee) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Check if employee is active
      if (!employee.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated',
        });
      }

      // Verify PIN
      if (employee.pin !== pin) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Create session
      const token = employeeSessionService.createSession(employee);

      // Update last login time
      await prisma.employee.update({
        where: { id: employee.id },
        data: { lastLoginAt: new Date() },
      });

      // Don't return pin
      const { pin: _, ...employeeData } = employee;

      return res.json({
        success: true,
        data: {
          token,
          employee: employeeData,
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

  /**
   * Employee logout
   */
  async logout(req: Request, res: Response) {
    try {
      const token = req.headers['x-employee-token'] as string;

      if (token) {
        employeeSessionService.deleteSession(token);
      }

      return res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      });
    }
  }

  /**
   * Get current employee info
   */
  async me(req: Request, res: Response) {
    try {
      const employee = (req as EmployeeRequest).employee;

      return res.json({
        success: true,
        data: employee,
      });
    } catch (error) {
      console.error('Get me error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get employee info',
      });
    }
  }

  // ============================================
  // EMPLOYEE MODE - CUSTOMER OPERATIONS
  // ============================================

  /**
   * Search customers by name or email
   */
  async searchCustomers(req: Request, res: Response) {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters',
        });
      }

      const customers = await prisma.faceProfile.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          totalPoints: true,
          createdAt: true,
          _count: {
            select: { orders: true },
          },
        },
        take: 10,
        orderBy: { name: 'asc' },
      });

      return res.json({
        success: true,
        data: customers,
      });
    } catch (error) {
      console.error('Search customers error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      });
    }
  }

  /**
   * Get customer details for employee view
   */
  async getCustomerDetails(req: Request, res: Response) {
    try {
      const { profileId } = req.params;

      // Get profile with preferences and recent orders
      const profile = await prisma.faceProfile.findUnique({
        where: { id: profileId },
        include: {
          preferences: true,
          orders: {
            include: { items: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }

      // Get recommendations
      const recommendations = await recommendationService.getPersonalized(
        profileId,
        'employee',
        10
      );

      // Extract recommendations data with proper type handling
      const recData = recommendations.data as {
        recommendations?: any[];
        insights?: string | null;
      } | undefined;

      // Get AI insight from UserPreference (unique per customer)
      // Fallback to recommendation cache insights if preference insight is empty
      const aiInsight = profile.preferences?.aiInsight || recData?.insights || null;
      const insightMetadata = profile.preferences?.insightMetadata || null;

      // Format response
      return res.json({
        success: true,
        data: {
          profile: {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            totalPoints: profile.totalPoints,
            avatarUrl: profile.avatarUrl,
            createdAt: profile.createdAt,
          },
          preferences: profile.preferences
            ? {
                vegPreference: profile.preferences.vegPreference,
                priceRange: profile.preferences.priceRange,
                avgOrderValue: profile.preferences.avgOrderValue,
                categoryAffinities: profile.preferences.categoryAffinities,
                tagAffinities: profile.preferences.tagAffinities,
                favoriteProducts: profile.preferences.favoriteProducts,
                totalOrders: profile.preferences.totalOrders,
                lastOrderAt: profile.preferences.lastOrderAt,
              }
            : null,
          recentOrders: profile.orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            grandTotal: order.grandTotal,
            status: order.status,
            createdAt: order.createdAt,
            itemCount: order.items.length,
            items: order.items.map((item) => ({
              productName: item.productName,
              quantity: item.quantity,
              isVeg: item.isVeg,
              effectivePrice: item.effectivePrice,
            })),
          })),
          recommendations: (recData?.recommendations || []).map((rec: any) => ({
            product: {
              id: rec.product.id,
              name: rec.product.name,
              slug: rec.product.slug,
              description: rec.product.description,
              price: rec.product.price,
              discountedPrice: rec.product.discounted_price,
              isVeg: rec.product.is_veg,
              tags: rec.product.tags,
              imageUrl: rec.product.image_url,
              thumbnailUrl: rec.product.thumbnail_url,
              categoryId: rec.product.category_id,
              categoryName: rec.product.category_name,
              isAvailable: rec.product.is_available,
              effectivePrice: rec.product.discounted_price || rec.product.price,
            },
            score: rec.score,
            reason: rec.reason,
            reasonType: rec.reasonType,
          })),
          // AI insight is now from UserPreference (unique per customer)
          aiInsights: aiInsight,
          // Also include structured metadata for analytics
          insightMetadata: insightMetadata,
        },
      });
    } catch (error) {
      console.error('Get customer details error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get customer details',
      });
    }
  }

  /**
   * Get AI communication suggestions for a customer
   */
  async getCommunicationSuggestions(req: Request, res: Response) {
    try {
      const { profileId } = req.params;

      // Get profile with preferences and orders
      const profile = await prisma.faceProfile.findUnique({
        where: { id: profileId },
        include: {
          preferences: true,
          orders: {
            include: { items: true },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
        },
      });

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }

      // Call Python backend for communication suggestions
      const result = await pythonClient.getCommunicationSuggestions(
        profileId,
        {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          totalPoints: profile.totalPoints,
        },
        profile.orders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          grandTotal: order.grandTotal.toString(),
          createdAt: order.createdAt.toISOString(),
          items: order.items.map(item => ({
            productName: item.productName,
            quantity: item.quantity,
            isVeg: item.isVeg,
            categoryName: item.categoryName,
          })),
        })),
        profile.preferences
      );

      if (!result.success) {
        // Return default suggestions if AI fails
        return res.json({
          success: true,
          data: {
            openingLines: [
              `Welcome back, ${profile.name}!`,
              `Great to see you again, ${profile.name}!`,
              `Hello ${profile.name}, how can I help you today?`,
            ],
            conversationTopics: [],
            specialNotes: profile.totalPoints > 500 ? ['Loyal customer with high points balance'] : [],
            upsellSuggestions: [],
          },
        });
      }

      return res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error('Get communication suggestions error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get communication suggestions',
      });
    }
  }

  /**
   * Refresh AI insights for a customer
   * POST /api/employees/mode/customer/:profileId/refresh-insights
   */
  async refreshCustomerInsights(req: Request, res: Response) {
    try {
      const { profileId } = req.params;

      // Check if profile exists
      const profile = await prisma.faceProfile.findUnique({
        where: { id: profileId },
      });

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }

      // Regenerate AI insights by calling updatePreferencesAfterOrder
      const result = await recommendationService.updatePreferencesAfterOrder(profileId);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || 'Failed to refresh insights',
        });
      }

      // Fetch the updated preferences with new insights
      const updatedPreferences = await prisma.userPreference.findUnique({
        where: { profileId },
      });

      return res.json({
        success: true,
        data: {
          aiInsight: updatedPreferences?.aiInsight || null,
          insightMetadata: updatedPreferences?.insightMetadata || null,
          insightUpdatedAt: updatedPreferences?.insightUpdatedAt || null,
        },
        message: 'AI insights refreshed successfully',
      });
    } catch (error) {
      console.error('Refresh customer insights error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh insights',
      });
    }
  }

  // ============================================
  // EMPLOYEE MODE - ORDER MANAGEMENT
  // ============================================

  /**
   * Get active orders for Kanban board
   * Returns orders with status: PENDING, CONFIRMED, PREPARING, READY
   */
  async getActiveOrders(req: Request, res: Response) {
    try {
      const orders = await prisma.order.findMany({
        where: {
          status: {
            in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'],
          },
        },
        include: {
          items: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      return res.json({
        success: true,
        data: orders.map(transformOrderForResponse),
      });
    } catch (error) {
      console.error('Get active orders error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active orders',
      });
    }
  }

  /**
   * Update order status (Employee mode)
   * PATCH /api/employees/mode/orders/:id/status
   */
  async updateOrderStatus(req: Request, res: Response) {
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
      const updateData: any = {
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
        },
      });

      // Deduct points when order is cancelled
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
        error: error instanceof Error ? error.message : 'Failed to update order status',
      });
    }
  }
}

export const employeeController = new EmployeeController();
