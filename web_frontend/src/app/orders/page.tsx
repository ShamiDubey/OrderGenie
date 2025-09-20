'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getOrdersByProfile, cancelOrder } from '@/lib/api';
import { Order, OrderStatus, OrderType } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const statusColors: Record<OrderStatus, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  PREPARING: { bg: 'bg-orange-100', text: 'text-orange-700' },
  READY: { bg: 'bg-green-100', text: 'text-green-700' },
  COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-700' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700' },
};

// Dynamic status labels based on order type
const getStatusLabel = (status: OrderStatus, orderType?: OrderType): string => {
  // For READY status, use order type specific messages
  if (status === 'READY') {
    switch (orderType) {
      case 'DINE_IN':
        return 'Ready to Serve';
      case 'PICKUP':
        return 'Awaiting Pickup';
      case 'TAKEAWAY':
        return 'Awaiting Takeaway';
      default:
        return 'Ready';
    }
  }

  // Default labels for other statuses
  const defaultLabels: Record<OrderStatus, string> = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Preparing',
    READY: 'Ready',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  return defaultLabels[status];
};

// Order type display config
const orderTypeConfig: Record<OrderType, { label: string; icon: string }> = {
  DINE_IN: { label: 'Dine In', icon: 'restaurant' },
  PICKUP: { label: 'Pickup', icon: 'shopping_bag' },
  TAKEAWAY: { label: 'Takeaway', icon: 'drive_eta' },
};

export default function OrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.id) {
      fetchOrders();
    }
  }, [isAuthenticated, user, router]);

  const fetchOrders = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getOrdersByProfile(user.id);
      if (result.success && result.data) {
        setOrders(result.data);
      } else {
        setError(result.error || 'Failed to load orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    setCancellingId(orderId);
    try {
      const result = await cancelOrder(orderId);
      if (result.success) {
        // Update local state
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? { ...order, status: 'CANCELLED' as OrderStatus }
              : order
          )
        );
      } else {
        alert(result.error || 'Failed to cancel order');
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      alert('Failed to cancel order');
    } finally {
      setCancellingId(null);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Orders</h1>
          <p className="text-gray-500 mt-1">Track and manage your orders</p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Order
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No orders yet</h2>
          <p className="text-gray-500 mb-6">Start exploring our menu and place your first order!</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Browse Menu
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Order Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-gray-800">{order.orderNumber}</span>
                    {/* Order Type Badge */}
                    {order.orderType && orderTypeConfig[order.orderType] && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <span className="material-symbols-outlined text-sm">
                          {orderTypeConfig[order.orderType].icon}
                        </span>
                        {orderTypeConfig[order.orderType].label}
                      </span>
                    )}
                    {/* Status Badge */}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        statusColors[order.status].bg
                      } ${statusColors[order.status].text}`}
                    >
                      {getStatusLabel(order.status, order.orderType)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-800">
                    ₹{parseFloat(order.grandTotal).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.items.length} item{order.items.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="p-4">
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 border rounded-sm flex items-center justify-center ${
                            item.isVeg ? 'border-green-600' : 'border-red-600'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isVeg ? 'bg-green-600' : 'bg-red-600'
                            }`}
                          />
                        </div>
                        <span className="text-gray-700">
                          {item.productName} x{item.quantity}
                        </span>
                      </div>
                      <span className="text-gray-600">
                        ₹{parseFloat(item.lineTotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Order Actions */}
                {order.status === 'PENDING' && (
                  <div className="mt-4 pt-4 border-t">
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancellingId === order.id}
                      className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                    >
                      {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  </div>
                )}

                {order.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Note:</span> {order.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
