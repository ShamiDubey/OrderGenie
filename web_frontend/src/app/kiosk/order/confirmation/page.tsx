"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useKiosk } from "@/context/KioskContext";
import { getOrderByNumber } from "@/lib/api";
import { Order } from "@/types";
import { Check, Loader2, Hourglass, RotateCcw, Star } from "lucide-react";

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetKiosk, user, mode } = useKiosk();

  const orderNumber = searchParams.get("orderNumber");
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(25);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleNewOrder();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch order details
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderNumber) {
        router.push("/kiosk");
        return;
      }

      try {
        const result = await getOrderByNumber(orderNumber);
        if (result.success && result.data) {
          setOrder(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch order:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderNumber, router]);

  const handleNewOrder = () => {
    resetKiosk();
    router.push("/kiosk");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8]">
        <Loader2 className="w-12 h-12 text-[#8B6B4F] animate-spin" />
      </div>
    );
  }

  const getOrderTypeLabel = () => {
    if (!order) return "";
    switch (order.orderType) {
      case "DINE_IN":
        return "Dine In";
      case "PICKUP":
        return "Pickup";
      case "TAKEAWAY":
        return "Takeaway";
      default:
        return "";
    }
  };

  const getStatusMessage = () => {
    if (!order) return "";
    switch (order.orderType) {
      case "DINE_IN":
        return "Please wait, we will bring your order to you.";
      case "PICKUP":
        return "We will notify you when your order is ready.";
      case "TAKEAWAY":
        return "Your order is being prepared for takeaway.";
      default:
        return "Your order is being prepared.";
    }
  };

  // Get total points from order items
  const totalPointsEarned = order
    ? order.items.reduce((sum, item) => sum + (item.royaltyPoints || 0), 0)
    : 0;

  // Get total item count
  const totalItemCount = order
    ? order.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-[#F5F0E8] to-[#EDE5D8]">
      {/* Success Checkmark */}
      <div className="mb-6">
        <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center">
          <Check className="w-10 h-10 text-[#2E7D32] stroke-[3]" />
        </div>
      </div>

      {/* Title */}
      <h1
        className="text-4xl font-bold text-[#3D2920] mb-2"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Order Placed!
      </h1>
      <p className="text-[#8B6B4F] text-lg mb-8">{getStatusMessage()}</p>

      {/* Order Details Card */}
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-lg mb-6">
        {/* Order Number */}
        <div className="text-center mb-4 pb-4 border-b border-[#E8DFD0]">
          <div className="text-xs text-[#8B6B4F] uppercase tracking-widest mb-1">
            Order Number
          </div>
          <div
            className="text-5xl font-bold text-[#3D2920]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {order?.orderNumber || orderNumber}
          </div>
        </div>

        {/* Order Details */}
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[#8B6B4F]">Order Type</span>
            <span className="font-semibold text-[#3D2920]">{getOrderTypeLabel()}</span>
          </div>

          {/* Items List */}
          {order && order.items.length > 0 && (
            <div className="pt-3 border-t border-[#E8DFD0]">
              <div className="text-[#8B6B4F] mb-2">Items ({totalItemCount})</div>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="font-medium text-[#3D2920]">{item.productName}</span>
                      {item.quantity > 1 && (
                        <span className="text-[#8B6B4F] ml-1">×{item.quantity}</span>
                      )}
                    </div>
                    <span className="text-[#3D2920] ml-2">
                      ₹{parseFloat(item.lineTotal).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {order && (
            <div className="flex justify-between pt-3 border-t border-[#E8DFD0]">
              <span className="font-semibold text-[#3D2920]">Total</span>
              <span className="font-bold text-[#3D2920] text-lg">
                ₹{parseFloat(order.grandTotal).toFixed(0)}
              </span>
            </div>
          )}

          {/* Points Earned */}
          {mode === "logged-in" && user && totalPointsEarned > 0 && (
            <div className="mt-3 bg-[#F5F9F5] rounded-lg p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-[#2E7D32] rounded-full flex items-center justify-center">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <div className="text-xs text-[#2E7D32] uppercase tracking-wide">Points Earned</div>
                <div className="text-lg font-bold text-[#2E7D32]">+{totalPointsEarned} pts</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wait Time */}
      <div className="flex items-center gap-2 text-[#8B6B4F] mb-8">
        <Hourglass className="w-4 h-4" />
        <span>Estimated wait: ~5 mins</span>
      </div>

      {/* New Order Button */}
      <button
        onClick={handleNewOrder}
        className="px-8 py-4 bg-white hover:bg-[#F5F0E8] rounded-xl text-[#3D2920] font-semibold text-lg transition-colors flex items-center gap-2 shadow-md border border-[#E8DFD0]"
      >
        <RotateCcw className="w-5 h-5" />
        Start New Order
      </button>

      {/* Auto redirect notice */}
      <p className="text-[#A99585] text-sm mt-6">
        Screen will automatically reset in {countdown}s
      </p>
    </div>
  );
}

export default function KioskConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8]">
          <Loader2 className="w-12 h-12 text-[#8B6B4F] animate-spin" />
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
