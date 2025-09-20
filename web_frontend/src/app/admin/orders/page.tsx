'use client';

import { useState, useEffect } from 'react';
import { getAdminOrders, updateOrderStatus } from '@/lib/api';
import { Order, OrderStatus, Pagination } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getPaymentMethodLabel } from '@/lib/utils';

const statusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  READY: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusFlow: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const result = await getAdminOrders({
      status: statusFilter || undefined,
      page,
      limit: 20,
    });
    if (result.success && result.data) {
      setOrders(result.data);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingStatus(orderId);
    const result = await updateOrderStatus(orderId, newStatus);
    if (result.success && result.data) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } else {
      alert(result.error || 'Failed to update status');
    }
    setUpdatingStatus(null);
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < statusFlow.length - 1) {
      return statusFlow[currentIndex + 1];
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Manage Orders</h1>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Orders</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            {/* Order Header */}
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() =>
                setExpandedOrder(expandedOrder === order.id ? null : order.id)
              }
            >
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-bold text-blue-600">{order.orderNumber}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <p className="font-medium text-gray-800">
                    {order.customerName}
                  </p>
                  {order.customerPhone && (
                    <p className="text-sm text-gray-500">{order.customerPhone}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                  <p className="font-bold text-gray-800">
                    ₹{parseFloat(order.grandTotal).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {order.items.length} item{order.items.length > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Status Badge */}
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statusColors[order.status]
                  }`}
                >
                  {order.status}
                </span>

                {/* Expand Arrow */}
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedOrder === order.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedOrder === order.id && (
              <div className="border-t bg-gray-50 p-4">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Customer Info */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">
                      Customer Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-gray-500">Name:</span>{' '}
                        <span className="font-medium">{order.customerName}</span>
                      </p>
                      {order.customerEmail && (
                        <p>
                          <span className="text-gray-500">Email:</span>{' '}
                          <span className="font-medium">{order.customerEmail}</span>
                        </p>
                      )}
                      {order.customerPhone && (
                        <p>
                          <span className="text-gray-500">Phone:</span>{' '}
                          <span className="font-medium">{order.customerPhone}</span>
                        </p>
                      )}
                      {order.paymentMethod && (
                        <p>
                          <span className="text-gray-500">Payment:</span>{' '}
                          <span className="font-medium">
                            {getPaymentMethodLabel(order.paymentMethod)}
                          </span>
                        </p>
                      )}
                      {order.notes && (
                        <p>
                          <span className="text-gray-500">Notes:</span>{' '}
                          <span className="font-medium italic">{order.notes}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">
                      Order Items
                    </h4>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-gray-600">
                            {item.productName} x{item.quantity}
                            {item.isVeg ? (
                              <span className="ml-1 text-green-600">(V)</span>
                            ) : (
                              <span className="ml-1 text-red-600">(NV)</span>
                            )}
                          </span>
                          <span className="font-medium">
                            ₹{parseFloat(item.lineTotal).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-bold">
                          <span>Total</span>
                          <span>₹{parseFloat(order.grandTotal).toFixed(2)}</span>
                        </div>
                        {order.pointsEarned && order.pointsEarned > 0 && (
                          <div className="flex justify-between text-amber-600 text-sm mt-1">
                            <span>Points Earned</span>
                            <span>+{order.pointsEarned}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Update Actions */}
                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    Update Status
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {statusFlow.map((status) => (
                      <button
                        key={status}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(order.id, status);
                        }}
                        disabled={
                          order.status === status ||
                          order.status === 'CANCELLED' ||
                          updatingStatus === order.id
                        }
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          order.status === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                      >
                        {updatingStatus === order.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          status
                        )}
                      </button>
                    ))}
                    {order.status !== 'CANCELLED' &&
                      order.status !== 'COMPLETED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                'Are you sure you want to cancel this order?'
                              )
                            ) {
                              handleStatusChange(order.id, 'CANCELLED');
                            }
                          }}
                          disabled={updatingStatus === order.id}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          Cancel Order
                        </button>
                      )}
                  </div>

                  {/* Quick Action: Advance to Next Status */}
                  {getNextStatus(order.status) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextStatus = getNextStatus(order.status);
                        if (nextStatus) {
                          handleStatusChange(order.id, nextStatus);
                        }
                      }}
                      disabled={updatingStatus === order.id}
                      className="mt-3 w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {updatingStatus === order.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 7l5 5m0 0l-5 5m5-5H6"
                            />
                          </svg>
                          Move to {getNextStatus(order.status)}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {orders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-gray-500">No orders found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!pagination.hasPrev}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!pagination.hasNext}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
