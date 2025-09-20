"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Order, OrderStatus, OrderType } from "@/types";

// Order type display config
const ORDER_TYPE_CONFIG: Record<
  OrderType,
  { label: string; icon: string; color: string }
> = {
  DINE_IN: { label: "Dine In", icon: "restaurant", color: "#3b82f6" },
  PICKUP: { label: "Pickup", icon: "shopping_bag", color: "#8b5cf6" },
  TAKEAWAY: { label: "Takeaway", icon: "drive_eta", color: "#f59e0b" },
};
import { getActiveOrders, updateEmployeeOrderStatus } from "@/lib/employee-api";

// Timer color thresholds (in minutes) - Edit this array to customize colors
const TIMER_COLOR_THRESHOLDS = [
  { maxMinutes: 7, color: "#22c55e" },   // Green (0-7 min)
  { maxMinutes: 13, color: "#84cc16" },  // Pale green / Lime (7-13 min)
  { maxMinutes: 22, color: "#eab308" },  // Yellow (13-22 min)
  { maxMinutes: 27, color: "#f97316" },  // Orange (22-27 min)
  { maxMinutes: Infinity, color: "#ef4444" }, // Red (27+ min)
];

// Get timer color based on elapsed minutes
const getTimerColor = (elapsedMinutes: number): string => {
  for (const threshold of TIMER_COLOR_THRESHOLDS) {
    if (elapsedMinutes < threshold.maxMinutes) {
      return threshold.color;
    }
  }
  return TIMER_COLOR_THRESHOLDS[TIMER_COLOR_THRESHOLDS.length - 1].color;
};

// Column configuration
const KANBAN_COLUMNS: {
  id: OrderStatus;
  title: string;
  icon: string;
  color: string;
}[] = [
  { id: "PENDING", title: "Pending", icon: "schedule", color: "#f59e0b" },
  { id: "CONFIRMED", title: "Confirmed", icon: "check_circle", color: "#3b82f6" },
  { id: "PREPARING", title: "Preparing", icon: "skillet", color: "#8b5cf6" },
  { id: "READY", title: "Ready", icon: "done_all", color: "#22c55e" },
];

// Timer component to show elapsed time with time-based color
function OrderTimer({ updatedAt }: { updatedAt: string }) {
  const [elapsed, setElapsed] = useState("");
  const [timerColor, setTimerColor] = useState(TIMER_COLOR_THRESHOLDS[0].color);

  useEffect(() => {
    const calculateElapsed = () => {
      const updated = new Date(updatedAt);
      const now = new Date();
      const diffMs = now.getTime() - updated.getTime();

      const seconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      // Update color based on elapsed minutes
      setTimerColor(getTimerColor(minutes));

      if (hours > 0) {
        setElapsed(`${hours}h ${minutes % 60}m`);
      } else if (minutes > 0) {
        setElapsed(`${minutes}m ${seconds % 60}s`);
      } else {
        setElapsed(`${seconds}s`);
      }
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [updatedAt]);

  return (
    <span
      className="text-xs font-semibold px-1.5 py-0.5 rounded"
      style={{ color: timerColor, backgroundColor: timerColor + "15" }}
    >
      {elapsed}
    </span>
  );
}

// Order Card Component
function OrderCard({
  order,
  isDragging = false,
  isOverlay = false,
  color = "#f59e0b",
}: {
  order: Order;
  isDragging?: boolean;
  isOverlay?: boolean;
  color?: string;
}) {
  return (
    <div
      className={`p-3 rounded-xl shadow-sm transition-all ${
        isDragging ? "opacity-40" : ""
      } ${isOverlay ? "shadow-xl scale-105 rotate-2" : ""}`}
      style={{
        backgroundColor: "var(--color-surface)",
        cursor: isOverlay ? "grabbing" : "grab",
      }}
    >
      {/* Customer Name & Timer */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <p
          className="font-semibold text-sm truncate flex-1"
          style={{ color: "var(--color-on-surface)" }}
        >
          {order.customerName}
        </p>
        <OrderTimer updatedAt={order.updatedAt} />
      </div>

      {/* Order Number & Type */}
      <div className="flex items-center justify-between mb-2">
        <p
          className="text-xs font-mono"
          style={{ color: "var(--color-primary)" }}
        >
          {order.orderNumber}
        </p>
        {/* Order Type Badge */}
        {order.orderType && ORDER_TYPE_CONFIG[order.orderType] && (
          <span
            className="inline-flex items-center gap-0.5 text-[9px] font-bold"
            style={{
              color: ORDER_TYPE_CONFIG[order.orderType].color,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>
              {ORDER_TYPE_CONFIG[order.orderType].icon}
            </span>
            {ORDER_TYPE_CONFIG[order.orderType].label}
          </span>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-1">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                item.isVeg ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span
              className="truncate flex-1"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              {item.productName}
            </span>
            <span
              className="font-medium"
              style={{ color: "var(--color-on-surface)" }}
            >
              x{item.quantity}
            </span>
          </div>
        ))}
      </div>

      {/* Special Instructions */}
      {order.notes && (
        <div
          className="mt-2 p-2 rounded-lg text-xs"
          style={{
            backgroundColor: "var(--color-tertiary-container)",
            color: "var(--color-on-tertiary-container)",
          }}
        >
          <div className="flex items-start gap-1">
            <span className="material-symbols-outlined text-sm flex-shrink-0">
              edit_note
            </span>
            <span className="italic">{order.notes}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Draggable Order Card
function DraggableOrderCard({ order, color }: { order: Order; color: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({ id: order.id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      <OrderCard order={order} isDragging={isDragging} color={color} />
    </div>
  );
}

// Droppable Column Component
function KanbanColumn({
  column,
  orders,
  isOver,
}: {
  column: (typeof KANBAN_COLUMNS)[0];
  orders: Order[];
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl overflow-hidden min-h-[400px] transition-all duration-200 ${
        isOver ? "scale-[1.02]" : ""
      }`}
      style={{
        backgroundColor: isOver ? column.color + "15" : "var(--color-surface-container-low)",
        boxShadow: isOver ? `0 0 0 3px ${column.color}` : "none",
      }}
    >
      {/* Column Header */}
      <div
        className="p-3 flex items-center gap-2"
        style={{ backgroundColor: column.color + "20" }}
      >
        <span
          className="material-symbols-outlined text-lg"
          style={{ color: column.color }}
        >
          {column.icon}
        </span>
        <span
          className="font-semibold text-sm"
          style={{ color: "var(--color-on-surface)" }}
        >
          {column.title}
        </span>
        <span
          className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: column.color + "30", color: column.color }}
        >
          {orders.length}
        </span>
      </div>

      {/* Column Content */}
      <div
        className={`flex-1 p-2 space-y-2 overflow-y-auto transition-colors duration-200`}
      >
        {orders.map((order) => (
          <DraggableOrderCard key={order.id} order={order} color={column.color} />
        ))}
        {orders.length === 0 && (
          <div
            className="text-center py-8 text-sm"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            No orders
          </div>
        )}
      </div>
    </div>
  );
}

// Side Drop Zone (Vertical)
function SideDropZone({
  id,
  title,
  icon,
  color,
  bgColor,
  isOver,
  side,
}: {
  id: string;
  title: string;
  icon: string;
  color: string;
  bgColor: string;
  isOver: boolean;
  side: "left" | "right";
}) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`fixed top-0 ${side === "left" ? "left-0" : "right-0"} h-full w-20 flex flex-col items-center justify-center gap-2 transition-all duration-200 z-30 ${
        isOver ? "w-28" : ""
      }`}
      style={{
        backgroundColor: isOver ? color + "30" : bgColor,
        borderRight: side === "left" ? `3px dashed ${isOver ? color : "transparent"}` : "none",
        borderLeft: side === "right" ? `3px dashed ${isOver ? color : "transparent"}` : "none",
      }}
    >
      <span
        className={`material-symbols-outlined transition-all duration-200 ${isOver ? "text-5xl" : "text-3xl"}`}
        style={{ color: color }}
      >
        {icon}
      </span>
      <div className="flex flex-col items-center">
        {title.split("").map((char, i) => (
          <span
            key={i}
            className={`font-bold leading-tight transition-all duration-200 ${isOver ? "text-lg" : "text-base"}`}
            style={{ color: color }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </div>
    </div>
  );
}

// Confirmation Modal
function ConfirmCancelModal({
  order,
  onConfirm,
  onCancel,
}: {
  order: Order;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="w-full max-w-md rounded-3xl p-6 shadow-xl"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <div className="text-center mb-6">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: "var(--color-error-container)" }}
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={{ color: "var(--color-error)" }}
            >
              warning
            </span>
          </div>
          <h3
            className="text-xl font-semibold mb-2"
            style={{ color: "var(--color-on-surface)" }}
          >
            Cancel Order?
          </h3>
          <p
            className="text-sm"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Are you sure you want to cancel order{" "}
            <span className="font-mono font-medium">{order.orderNumber}</span>{" "}
            for <span className="font-medium">{order.customerName}</span>?
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-medium transition-all hover:opacity-80"
            style={{
              backgroundColor: "var(--color-surface-container)",
              color: "var(--color-on-surface)",
            }}
          >
            Keep Order
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-medium transition-all hover:opacity-90"
            style={{
              backgroundColor: "var(--color-error)",
              color: "var(--color-on-error)",
            }}
          >
            Cancel Order
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Kanban Component
export default function OrderKanban() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [overZone, setOverZone] = useState<string | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      const result = await getActiveOrders();
      if (result.success && result.data) {
        setOrders(result.data);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch orders");
      }
    } catch (err) {
      setError("Failed to fetch orders");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Get orders by status
  const getOrdersByStatus = (status: OrderStatus) =>
    orders.filter((order) => order.status === status);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const order = orders.find((o) => o.id === event.active.id);
    if (order) {
      setActiveOrder(order);
      setIsDragging(true);
    }
  };

  // Handle drag over
  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string;
    setOverZone(overId || null);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);
    setOverZone(null);
    setIsDragging(false);

    if (!over) return;

    const orderId = active.id as string;
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const newStatus = over.id as string;

    // Check if it's a valid status column or side zone
    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "COMPLETED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(newStatus)) return;

    // No change needed if same status
    if (order.status === newStatus) return;

    // Show confirmation for cancellation
    if (newStatus === "CANCELLED") {
      setCancelModalOrder(order);
      return;
    }

    // Update status
    await updateOrderStatusHandler(orderId, newStatus as OrderStatus);
  };

  // Update order status
  const updateOrderStatusHandler = async (orderId: string, newStatus: OrderStatus) => {
    setIsUpdating(true);

    // Optimistic update
    setOrders((prev) =>
      newStatus === "COMPLETED" || newStatus === "CANCELLED"
        ? prev.filter((o) => o.id !== orderId)
        : prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o))
    );

    try {
      const result = await updateEmployeeOrderStatus(orderId, newStatus);
      if (!result.success) {
        // Revert on failure
        fetchOrders();
        setError(result.error || "Failed to update order");
      }
    } catch (err) {
      fetchOrders();
      setError("Failed to update order");
    }

    setIsUpdating(false);
  };

  // Handle cancel confirmation
  const handleCancelConfirm = async () => {
    if (cancelModalOrder) {
      await updateOrderStatusHandler(cancelModalOrder.id, "CANCELLED");
      setCancelModalOrder(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Side Drop Zones - Only visible when dragging */}
      {isDragging && (
        <>
          <SideDropZone
            id="CANCELLED"
            title="CANCEL"
            icon="cancel"
            color="#ef4444"
            bgColor="#fef2f2"
            isOver={overZone === "CANCELLED"}
            side="left"
          />
          <SideDropZone
            id="COMPLETED"
            title="COMPLETE"
            icon="task_alt"
            color="#22c55e"
            bgColor="#f0fdf4"
            isOver={overZone === "COMPLETED"}
            side="right"
          />
        </>
      )}

      {/* Main Content */}
      <div>
        {/* Error Message */}
        {error && (
          <div
            className="mb-4 p-3 rounded-xl text-center text-sm"
            style={{
              backgroundColor: "var(--color-error-container)",
              color: "var(--color-on-error-container)",
            }}
          >
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Refresh Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={fetchOrders}
            disabled={isUpdating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
            style={{
              backgroundColor: "var(--color-surface)",
              color: "var(--color-on-surface)",
            }}
          >
            <span
              className={`material-symbols-outlined text-lg ${
                isUpdating ? "animate-spin" : ""
              }`}
            >
              refresh
            </span>
            Refresh
          </button>
        </div>

        {/* Kanban Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              orders={getOrdersByStatus(column.id)}
              isOver={overZone === column.id}
            />
          ))}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeOrder && (
          <OrderCard
            order={activeOrder}
            isOverlay
            color={KANBAN_COLUMNS.find((c) => c.id === activeOrder.status)?.color || "#f59e0b"}
          />
        )}
      </DragOverlay>

      {/* Cancel Confirmation Modal */}
      {cancelModalOrder && (
        <ConfirmCancelModal
          order={cancelModalOrder}
          onConfirm={handleCancelConfirm}
          onCancel={() => setCancelModalOrder(null)}
        />
      )}

      {/* Global cursor style when dragging */}
      {isDragging && (
        <style jsx global>{`
          * {
            cursor: grabbing !important;
          }
        `}</style>
      )}
    </DndContext>
  );
}
