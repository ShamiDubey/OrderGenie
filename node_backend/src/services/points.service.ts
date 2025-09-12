/**
 * Points Service
 * Handles royalty points operations - earning, tracking, and balance management.
 */

import { prisma } from './prisma';
import { OrderItem } from '@prisma/client';

class PointsService {
  /**
   * Calculate total royalty points for order items.
   */
  calculateOrderPoints(orderItems: { royaltyPoints: number; quantity: number }[]): number {
    return orderItems.reduce((total, item) => {
      return total + (item.royaltyPoints * item.quantity);
    }, 0);
  }

  /**
   * Credit points to user when order is placed.
   * Creates a points transaction and updates user's total points.
   */
  async creditOrderPoints(orderId: string, profileId: string): Promise<void> {
    console.log(`[POINTS] Starting creditOrderPoints for order ${orderId}, profile ${profileId}`);

    // Get order with items to calculate points
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      console.error(`[POINTS] Order ${orderId} not found`);
      throw new Error('Order not found');
    }

    console.log(`[POINTS] Order found: ${order.orderNumber}, items: ${order.items.length}`);
    console.log(`[POINTS] Order items royalty points:`, order.items.map(i => ({ name: i.productName, qty: i.quantity, pts: i.royaltyPoints })));

    // Check if points already credited for this order
    const existingTransaction = await prisma.pointsTransaction.findUnique({
      where: { orderId },
    });

    if (existingTransaction) {
      console.log(`[POINTS] Points already credited for order ${orderId}`);
      return;
    }

    // Calculate total points from order items
    const totalPoints = this.calculateOrderPoints(
      order.items.map((item) => ({
        royaltyPoints: item.royaltyPoints,
        quantity: item.quantity,
      }))
    );

    console.log(`[POINTS] Calculated total points: ${totalPoints}`);

    if (totalPoints <= 0) {
      console.log(`[POINTS] No points to credit for order ${orderId} (totalPoints: ${totalPoints})`);
      return;
    }

    // Create transaction and update profile points atomically
    await prisma.$transaction([
      // Create points transaction record
      prisma.pointsTransaction.create({
        data: {
          profileId,
          orderId,
          points: totalPoints,
          type: 'EARNED',
          description: `Earned from order ${order.orderNumber}`,
        },
      }),
      // Update user's total points
      prisma.faceProfile.update({
        where: { id: profileId },
        data: {
          totalPoints: { increment: totalPoints },
        },
      }),
      // Update order with points earned
      prisma.order.update({
        where: { id: orderId },
        data: { pointsEarned: totalPoints },
      }),
    ]);

    console.log(`[POINTS] SUCCESS: Credited ${totalPoints} points to profile ${profileId} for order ${orderId}`);

    // Verify the update
    const updatedProfile = await prisma.faceProfile.findUnique({
      where: { id: profileId },
      select: { totalPoints: true },
    });
    console.log(`[POINTS] Profile ${profileId} now has ${updatedProfile?.totalPoints} total points`);
  }

  /**
   * Deduct points when an order is cancelled.
   * Only deducts if points were previously credited for this order.
   * Ensures user's total points never go below 0.
   */
  async deductOrderPoints(orderId: string, profileId: string): Promise<void> {
    // Find the original transaction for this order
    const existingTransaction = await prisma.pointsTransaction.findUnique({
      where: { orderId },
    });

    if (!existingTransaction) {
      console.log(`No points transaction found for order ${orderId}, nothing to deduct`);
      return;
    }

    if (existingTransaction.type === 'DEDUCTED') {
      console.log(`Points already deducted for order ${orderId}`);
      return;
    }

    const pointsToDeduct = existingTransaction.points;

    // Get current user points
    const profile = await prisma.faceProfile.findUnique({
      where: { id: profileId },
      select: { totalPoints: true },
    });

    if (!profile) {
      console.log(`Profile ${profileId} not found`);
      return;
    }

    // Calculate actual deduction (minimum 0 balance)
    const actualDeduction = Math.min(pointsToDeduct, profile.totalPoints);

    // Get order for description
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true },
    });

    // Create deduction transaction and update profile points atomically
    await prisma.$transaction([
      // Create deduction transaction record
      prisma.pointsTransaction.create({
        data: {
          profileId,
          orderId: null, // Don't link to order since original already exists
          points: -actualDeduction,
          type: 'DEDUCTED',
          description: `Deducted due to cancelled order ${order?.orderNumber || orderId}`,
        },
      }),
      // Update user's total points (never below 0)
      prisma.faceProfile.update({
        where: { id: profileId },
        data: {
          totalPoints: { decrement: actualDeduction },
        },
      }),
      // Update order to reflect points deducted
      prisma.order.update({
        where: { id: orderId },
        data: { pointsEarned: 0 },
      }),
    ]);

    console.log(`Deducted ${actualDeduction} points from profile ${profileId} for cancelled order ${orderId}`);
  }

  /**
   * Get user's total points balance.
   */
  async getUserPoints(profileId: string): Promise<{ totalPoints: number; formatted: string }> {
    const profile = await prisma.faceProfile.findUnique({
      where: { id: profileId },
      select: { totalPoints: true },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    return {
      totalPoints: profile.totalPoints,
      formatted: this.formatPoints(profile.totalPoints),
    };
  }

  /**
   * Get user's points transaction history.
   */
  async getPointsHistory(
    profileId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    transactions: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.pointsTransaction.findMany({
        where: { profileId },
        include: {
          order: {
            select: {
              orderNumber: true,
              grandTotal: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pointsTransaction.count({
        where: { profileId },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Format points for display (e.g., 1.1K for 1100+).
   */
  formatPoints(points: number): string {
    if (points >= 1000) {
      const formatted = (points / 1000).toFixed(1);
      // Remove trailing .0
      return formatted.endsWith('.0')
        ? `${Math.floor(points / 1000)}K`
        : `${formatted}K`;
    }
    return points.toString();
  }
}

export const pointsService = new PointsService();
