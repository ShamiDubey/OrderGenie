"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useKiosk } from "@/context/KioskContext";
import { getCategories, getProducts } from "@/lib/api";
import { Category, Product, OrderType, CategoryModifier } from "@/types";
import ProductCustomizationModal from "./ProductCustomizationModal";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  ArrowLeft,
  Loader2,
  User,
  MapPin,
  ShoppingBag,
  UtensilsCrossed,
  Check,
  SlidersHorizontal,
  Trash2,
  ArrowRight,
  LayoutGrid,
  ClipboardList,
  MessageSquare,
} from "lucide-react";

const ORDER_TYPE_OPTIONS: {
  type: OrderType;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    type: "DINE_IN",
    label: "Dine In",
    icon: <UtensilsCrossed className="w-5 h-5" />,
    description: "Table number required at counter",
  },
  {
    type: "PICKUP",
    label: "Pickup",
    icon: <MapPin className="w-5 h-5" />,
    description: "Pick up at counter when ready",
  },
  {
    type: "TAKEAWAY",
    label: "Takeaway",
    icon: <ShoppingBag className="w-5 h-5" />,
    description: "Ready for takeaway",
  },
];

export default function KioskOrderPage() {
  const router = useRouter();
  const {
    mode,
    user,
    guestInfo,
    cart,
    orderType,
    addToCart,
    updateQuantity,
    updateSpecialInstructions,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartItemCount,
    setOrderType,
    updateGuestInfo,
    // Preloaded data from context
    categories: preloadedCategories,
    products: preloadedProducts,
    isDataPreloaded,
  } = useKiosk();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // Product customization modal state
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductModifiers, setSelectedProductModifiers] = useState<
    CategoryModifier[]
  >([]);

  // Guest form state
  const [guestName, setGuestName] = useState(guestInfo?.name || "");
  const [guestPhone, setGuestPhone] = useState(guestInfo?.phone || "");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Order-level special instructions
  const [orderNotes, setOrderNotes] = useState("");

  // Load categories and products - use preloaded data if available
  useEffect(() => {
    // If data is preloaded in context, use it immediately
    if (isDataPreloaded && preloadedCategories.length > 0) {
      setCategories(preloadedCategories);
      setProducts(preloadedProducts);
      setIsLoading(false);
      return;
    }

    // Otherwise fetch data
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [catResult, prodResult] = await Promise.all([
          getCategories(),
          getProducts({ available: true }),
        ]);

        if (catResult.success && catResult.data) {
          setCategories(catResult.data.filter((c) => c.isActive));
        }
        if (prodResult.success && prodResult.data) {
          setProducts(prodResult.data);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isDataPreloaded, preloadedCategories, preloadedProducts]);

  // Filter products by category
  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products;

  // Get cart quantity for a product (sum all entries for this product)
  const getCartQuantity = (productId: string) => {
    return cart
      .filter((i) => i.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // Handle product click - open customization modal if category has modifiers
  const handleProductClick = (product: Product) => {
    // Find category for this product
    const category = categories.find((c) => c.id === product.categoryId);
    const modifiers = category?.modifiers || [];

    if (modifiers.length > 0) {
      // Show customization modal
      setSelectedProduct(product);
      setSelectedProductModifiers(modifiers);
      setShowCustomizationModal(true);
    } else {
      // No modifiers, add directly to cart
      handleAddToCartDirect(product);
    }
  };

  // Add product to cart directly (no modifiers)
  const handleAddToCartDirect = (product: Product) => {
    const effectivePrice =
      typeof product.effectivePrice === "string"
        ? parseFloat(product.effectivePrice)
        : product.effectivePrice;
    const originalPrice = parseFloat(product.price);

    addToCart({
      productId: product.id,
      name: product.name,
      price: effectivePrice,
      originalPrice:
        originalPrice !== effectivePrice ? originalPrice : undefined,
      isVeg: product.isVeg,
      imageUrl: product.imageUrl,
    });
  };

  // Handle add to cart from customization modal
  const handleAddToCartWithModifiers = (
    item: Parameters<typeof addToCart>[0]
  ) => {
    addToCart(item);
    setShowCustomizationModal(false);
    setSelectedProduct(null);
  };

  // Handle checkout
  const handleProceedToCheckout = () => {
    if (getCartItemCount() === 0) return;
    setShowCart(false);
    setShowCheckout(true);
    setCheckoutError(null);
  };

  // Build modifiers string for order notes
  const buildModifiersString = () => {
    const itemsWithModifiers = cart.filter(
      (item) => item.selectedModifiers && item.selectedModifiers.length > 0
    );

    if (itemsWithModifiers.length === 0) return "";

    return itemsWithModifiers
      .map((item) => {
        const modifierNames = item
          .selectedModifiers!.flatMap((mod) =>
            mod.options.map((opt) => opt.name)
          )
          .join(", ");
        return `${item.name}: ${modifierNames}`;
      })
      .join(" | ");
  };

  // Place order
  const handlePlaceOrder = async () => {
    // Validate guest info
    if (mode === "guest") {
      if (!guestName.trim() || !guestPhone.trim()) {
        setCheckoutError("Please enter your name and phone number");
        return;
      }
      updateGuestInfo({ name: guestName, phone: guestPhone });
    }

    setIsPlacingOrder(true);
    setCheckoutError(null);

    try {
      const { createOrder } = await import("@/lib/api");

      // Combine user notes with modifiers string
      const modifiersString = buildModifiersString();
      const finalNotes = [orderNotes.trim(), modifiersString]
        .filter(Boolean)
        .join(" | ");

      const orderData = {
        customerName: mode === "logged-in" ? user?.name || "" : guestName,
        customerEmail: mode === "logged-in" ? user?.email : undefined,
        customerPhone:
          mode === "logged-in" ? user?.phone || undefined : guestPhone,
        profileId: mode === "logged-in" ? user?.id : undefined,
        orderType,
        notes: finalNotes || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const result = await createOrder(orderData);

      if (result.success && result.data) {
        // Navigate to confirmation
        router.push(
          `/kiosk/order/confirmation?orderNumber=${result.data.orderNumber}`
        );
      } else {
        setCheckoutError(result.error || "Failed to place order");
      }
    } catch (err) {
      setCheckoutError("Failed to place order. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Back to home
  const handleBackToHome = () => {
    clearCart();
    router.push("/kiosk");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F5F1]">
        <Loader2 className="w-12 h-12 text-[#8B4513] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#F8F5F1] select-none">
      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background-color: #d4b9ad;
          border-radius: 20px;
        }
      `}</style>

      {/* Header */}
      <header className="h-20 bg-white/90 backdrop-blur-sm border-b border-[#E6D7D0] flex items-center justify-between px-6 md:px-8 z-30 shrink-0 shadow-sm relative">
        <button
          onClick={handleBackToHome}
          className="flex items-center gap-2 text-[#6F370F] font-bold hover:bg-[#FAF7F5] px-4 py-2 rounded-full transition-all active:scale-95 group"
        >
          <div className="bg-[#F2EBE7] rounded-full p-1 group-hover:bg-[#E6D7D0] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="text-lg">Start Over</span>
        </button>

        {/* Center Logo */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 opacity-80">
          <span className="text-3xl font-black tracking-tighter pacifico text-[#4E260A]">
            Barista
          </span>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 bg-white px-2 py-1.5 pr-4 rounded-full border border-[#F2EBE7] shadow-sm">
          <div className="w-10 h-10 rounded-full bg-[#8B4513] flex items-center justify-center text-white shadow-md">
            <User className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#A0705E] font-bold uppercase tracking-wider leading-none mb-0.5">
              Ordering as
            </span>
            <span className="text-sm font-bold text-[#3A1C07] leading-none">
              {mode === "logged-in" && user ? user.name : "Guest"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Category Sidebar */}
        <aside className="w-[120px] bg-white border-r border-[#E6D7D0] flex flex-col items-center py-6 overflow-y-auto shrink-0 z-20 shadow-[4px_0_24px_rgba(139,69,19,0.03)] pb-24 no-scrollbar">
          <div className="flex flex-col gap-6 w-full px-3">
            {/* All Items */}
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex flex-col items-center gap-2 group w-full"
            >
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all transform hover:scale-105 relative ${
                  selectedCategory === null
                    ? "bg-[#8B4513] text-white shadow-lg shadow-[#8B4513]/30 ring-4 ring-[#FAF7F5]"
                    : "bg-[#FAF7F5] text-[#8B4513] hover:bg-[#F2EBE7] border border-[#F2EBE7]"
                }`}
              >
                <LayoutGrid className="w-7 h-7" />
                {selectedCategory === null && (
                  <div className="absolute -right-1 -top-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full" />
                )}
              </div>
              <span
                className={`text-xs font-bold ${
                  selectedCategory === null
                    ? "text-[#4E260A]"
                    : "text-[#8B4513]"
                }`}
              >
                All Items
              </span>
            </button>

            {/* Category buttons */}
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex flex-col items-center gap-2 group w-full transition-opacity ${
                  selectedCategory !== category.id
                    ? "opacity-70 hover:opacity-100"
                    : ""
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all transform group-active:scale-95 overflow-hidden ${
                    selectedCategory === category.id
                      ? "bg-[#8B4513] text-white shadow-lg shadow-[#8B4513]/30 ring-4 ring-[#FAF7F5]"
                      : "bg-[#FAF7F5] text-[#8B4513] group-hover:bg-[#F2EBE7] border border-[#F2EBE7]"
                  }`}
                >
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt={category.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">☕</span>
                  )}
                </div>
                <span
                  className={`text-xs font-bold text-center leading-tight ${
                    selectedCategory === category.id
                      ? "text-[#4E260A]"
                      : "text-[#8B4513]"
                  }`}
                >
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Product Grid Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 pb-40 bg-[#F8F5F1] custom-scroll">
          <div className="max-w-7xl mx-auto">
            {/* Menu Header */}
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-4xl font-black text-[#3A1C07] mb-2 tracking-tight">
                  Our Menu
                </h2>
                <p className="text-[#A0705E] font-medium">
                  Handcrafted coffee and fresh bites prepared just for you.
                </p>
              </div>
              <button className="flex items-center gap-2 text-[#8B4513] bg-white px-4 py-2 rounded-lg shadow-sm border border-[#F2EBE7] text-sm font-bold hover:bg-[#FAF7F5] transition-colors">
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const qty = getCartQuantity(product.id);
                const effectivePrice =
                  typeof product.effectivePrice === "string"
                    ? parseFloat(product.effectivePrice)
                    : product.effectivePrice;
                const originalPrice = parseFloat(product.price);
                const hasDiscount =
                  product.hasActiveDiscount && product.discountedPrice;
                const discountPercent = hasDiscount
                  ? Math.round(
                      ((originalPrice - effectivePrice) / originalPrice) * 100
                    )
                  : 0;

                return (
                  <div
                    key={product.id}
                    className={`bg-white rounded-[2rem] p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-[#F2EBE7] flex flex-col h-full group ${
                      !product.isAvailable
                        ? "opacity-60 pointer-events-none grayscale"
                        : ""
                    } ${qty > 0 ? "shadow-md ring-2 ring-[#8B4513]/10" : ""}`}
                  >
                    {/* Product Image */}
                    <div className="relative w-full aspect-[1.1] rounded-[1.5rem] overflow-hidden mb-4 bg-[#FAF7F5]">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#D4B9AD] text-4xl">
                          ☕
                        </div>
                      )}

                      {/* Discount badge */}
                      {hasDiscount && (
                        <div className="absolute top-3 left-3 bg-[#8B4513] text-white text-[10px] font-black px-2.5 py-1 rounded-md shadow-md uppercase tracking-wider">
                          {discountPercent}% OFF
                        </div>
                      )}

                      {/* Featured badge */}
                      {!hasDiscount && product.isFeatured && (
                        <div className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-md shadow-md uppercase tracking-wider">
                          New Arrival
                        </div>
                      )}

                      {/* Sold out overlay */}
                      {!product.isAvailable && (
                        <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-[1px]">
                          <span className="bg-[#3A1C07] text-white text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-xl transform rotate-12 border-2 border-white">
                            Sold Out
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Veg indicator and Category */}
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`w-5 h-5 border flex items-center justify-center rounded-[4px] shrink-0 ${
                          product.isVeg
                            ? "border-[#0FA958] text-[#0FA958] bg-green-50"
                            : "border-[#C2372E] text-[#C2372E] bg-red-50"
                        }`}
                      >
                        {product.isVeg ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-current" />
                        ) : (
                          <span className="text-[14px] leading-none">▲</span>
                        )}
                      </div>
                      {/* Category name */}
                      {product.category && (
                        <span className="text-xs font-semibold text-[#A0705E] uppercase tracking-wide">
                          {product.category.name}
                        </span>
                      )}
                    </div>

                    {/* Product Name & Description */}
                    <h3 className="font-bold text-[#3A1C07] text-xl leading-tight mb-1">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-sm text-[#A0705E] mb-4 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    )}

                    {/* Price and Add Button */}
                    <div className="mt-auto flex items-center justify-between pt-2 border-t border-dashed border-[#F2EBE7]">
                      <div className="flex flex-col">
                        {hasDiscount && (
                          <span className="text-xs text-[#A0705E] line-through font-medium">
                            ₹{originalPrice.toFixed(0)}
                          </span>
                        )}
                        <span className="font-black text-[#4E260A] text-2xl">
                          ₹{effectivePrice.toFixed(0)}
                        </span>
                      </div>

                      {/* Add/Quantity Controls */}
                      {product.isAvailable && (
                        <>
                          {qty === 0 ? (
                            <button
                              onClick={() => handleProductClick(product)}
                              className="w-12 h-12 rounded-full bg-[#F2EBE7] text-[#6F370F] hover:bg-[#8B4513] hover:text-white flex items-center justify-center transition-all active:scale-90 shadow-sm"
                            >
                              <Plus className="w-5 h-5" strokeWidth={3} />
                            </button>
                          ) : (
                            <div className="flex items-center bg-[#FAF7F5] rounded-full p-1 border border-[#E6D7D0] shadow-inner">
                              <button
                                onClick={() => {
                                  // Find first cart item for this product and decrement
                                  const cartItem = cart.find(
                                    (i) => i.productId === product.id
                                  );
                                  if (cartItem) {
                                    updateQuantity(
                                      cartItem.cartItemId,
                                      cartItem.quantity - 1
                                    );
                                  }
                                }}
                                className="w-8 h-8 rounded-full bg-white text-[#6F370F] shadow-sm flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                              >
                                <Minus className="w-4 h-4" strokeWidth={3} />
                              </button>
                              <span className="font-bold text-[#3A1C07] w-8 text-center text-lg">
                                {qty}
                              </span>
                              <button
                                onClick={() => {
                                  // Find first cart item for this product and increment
                                  const cartItem = cart.find(
                                    (i) => i.productId === product.id
                                  );
                                  if (cartItem) {
                                    updateQuantity(
                                      cartItem.cartItemId,
                                      cartItem.quantity + 1
                                    );
                                  }
                                }}
                                className="w-8 h-8 rounded-full bg-[#8B4513] text-white shadow-md flex items-center justify-center hover:bg-[#6F370F] transition-colors"
                              >
                                <Plus className="w-4 h-4" strokeWidth={3} />
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {!product.isAvailable && (
                        <button className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center cursor-not-allowed">
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center text-[#A0705E] py-12">
                No products found in this category
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Bottom Cart Bar */}
      {getCartItemCount() > 0 && !showCart && !showCheckout && (
        <div className="fixed bottom-0 left-0 w-full z-50 bg-[#8B4513] text-white shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-[#6F370F]">
          <div className="flex items-center justify-between px-4 md:px-8 py-2 max-w-[1920px] mx-auto">
            <div className="flex flex-col">
              <span className="text-[10px] text-[#E6D7D0] uppercase tracking-wider font-bold">
                Total • {getCartItemCount()} Items
              </span>
              <span className="text-2xl font-black tracking-tight">
                ₹{getCartTotal().toFixed(0)}
              </span>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="flex items-center gap-2 bg-white text-[#4E260A] pl-5 pr-2 py-2 rounded-full font-bold text-sm hover:bg-[#FAF7F5] transition-all shadow-xl active:scale-95 group"
            >
              View Cart
              <div className="w-8 h-8 rounded-full bg-[#3A1C07] text-white flex items-center justify-center group-hover:bg-[#6F370F] transition-all shadow-md">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#F2EBE7]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#8B4513]" />
                <h2 className="text-lg font-bold text-[#3A1C07]">Your Cart</h2>
                <span className="px-2 py-0.5 bg-[#FAF7F5] rounded-full text-xs font-bold text-[#8B4513]">
                  {getCartItemCount()} items
                </span>
              </div>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-[#FAF7F5] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#A0705E]" />
              </button>
            </div>

            {/* Cart Items - Takes most space */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[40vh]">
              {cart.map((item) => {
                const itemTotal =
                  (item.price + (item.modifiersTotal || 0)) * item.quantity;
                const hasDiscount =
                  item.originalPrice && item.originalPrice !== item.price;
                return (
                  <div
                    key={item.cartItemId}
                    className="border border-[#F2EBE7] rounded-xl p-3"
                  >
                    <div className="flex items-start gap-3">
                      {item.imageUrl && (
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[#FAF7F5]">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#3A1C07] text-sm leading-tight">
                          {item.name}
                        </h3>
                        {/* Price with original price strikethrough */}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-bold text-[#8B4513] text-sm">
                            ₹{item.price.toFixed(0)}
                          </span>
                          {hasDiscount && (
                            <span className="text-xs text-[#A0705E] line-through">
                              ₹{item.originalPrice!.toFixed(0)}
                            </span>
                          )}
                        </div>
                        {/* Show selected modifiers */}
                        {item.selectedModifiers &&
                          item.selectedModifiers.length > 0 && (
                            <div className="mt-1 text-[10px] text-[#A0705E]">
                              {item.selectedModifiers
                                .flatMap((mod) =>
                                  mod.options.map((opt) => opt.name)
                                )
                                .join(", ")}
                            </div>
                          )}
                      </div>
                    </div>
                    {/* Quantity and Remove - Inline */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-[#F2EBE7]">
                      <button
                        onClick={() => removeFromCart(item.cartItemId)}
                        className="p-1.5 text-[#A0705E] hover:text-[#C2372E] hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1 border border-[#F2EBE7] rounded-full p-0.5 bg-[#FAF7F5]">
                        <button
                          onClick={() =>
                            updateQuantity(item.cartItemId, item.quantity - 1)
                          }
                          className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-full text-[#A0705E] transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center font-bold text-[#3A1C07] text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.cartItemId, item.quantity + 1)
                          }
                          className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-full text-[#A0705E] transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-[#3A1C07]">
                        ₹{itemTotal.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Section - Compact */}
            <div className="border-t border-[#F2EBE7] bg-[#FAFAF8]">
              {/* Order Type Selection - Compact */}
              <div className="px-4 py-3 border-b border-[#F2EBE7]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#A0705E] uppercase tracking-wider shrink-0">
                    Order Type
                  </span>
                  <div className="flex gap-1.5 flex-1 justify-end">
                    {ORDER_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.type}
                        onClick={() => setOrderType(opt.type)}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs font-bold ${
                          orderType === opt.type
                            ? "bg-[#8B4513] text-white"
                            : "bg-white text-[#8B4513] border border-[#F2EBE7] hover:bg-[#FAF7F5]"
                        }`}
                      >
                        {orderType === opt.type && (
                          <Check className="w-3 h-3" />
                        )}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Special Instructions - Compact single line */}
              <div className="px-4 py-2 border-b border-[#F2EBE7]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#A0705E] shrink-0" />
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Add special instructions..."
                    className="flex-1 text-sm py-1.5 bg-transparent text-[#3A1C07] placeholder-[#D4B9AD] focus:outline-none"
                  />
                </div>
              </div>

              {/* Total and Checkout */}
              <div className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-xs text-[#A0705E]">Total</div>
                  <div className="text-xl font-black text-[#3A1C07]">
                    ₹{getCartTotal().toFixed(0)}
                  </div>
                </div>
                <button
                  onClick={handleProceedToCheckout}
                  className="flex-1 py-3 bg-[#8B4513] hover:bg-[#6F370F] rounded-xl text-white font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Customization Modal */}
      {showCustomizationModal && selectedProduct && (
        <ProductCustomizationModal
          product={selectedProduct}
          categoryModifiers={selectedProductModifiers}
          onClose={() => {
            setShowCustomizationModal(false);
            setSelectedProduct(null);
          }}
          onAddToCart={handleAddToCartWithModifiers}
        />
      )}

      {/* Checkout Modal - Light Theme */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#F2EBE7]">
              <h2 className="text-2xl font-black text-[#3A1C07]">Checkout</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-2 hover:bg-[#FAF7F5] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#A0705E]" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Order Summary */}
              <div className="border border-[#F2EBE7] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-[#8B4513]" />
                    <h3 className="font-bold text-[#3A1C07]">Order Summary</h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowCheckout(false);
                      setShowCart(true);
                    }}
                    className="text-[#8B4513] text-sm font-bold hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="space-y-3">
                  {cart.map((item) => {
                    const itemTotal =
                      (item.price + (item.modifiersTotal || 0)) * item.quantity;
                    return (
                      <div
                        key={item.cartItemId}
                        className="pb-3 border-b border-dashed border-[#F2EBE7] last:border-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xs bg-[#FAF7F5] px-2 py-1 rounded font-bold text-[#A0705E]">
                              {item.quantity}x
                            </span>
                            <span className="text-[#3A1C07] font-medium">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-[#A0705E] font-medium">
                            ₹{itemTotal.toFixed(0)}
                          </span>
                        </div>
                        {/* Show selected modifiers */}
                        {item.selectedModifiers &&
                          item.selectedModifiers.length > 0 && (
                            <div className="ml-12 mt-1 space-y-0.5">
                              {item.selectedModifiers.map((mod) => (
                                <div
                                  key={mod.groupName}
                                  className="text-[10px] text-[#A0705E]"
                                >
                                  {mod.options.map((opt) => (
                                    <span
                                      key={opt.name}
                                      className="inline-block mr-2"
                                    >
                                      • {opt.name}
                                      {opt.price > 0 && (
                                        <span className="text-[#8B4513]">
                                          {" "}
                                          +₹{opt.price}
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
                {/* Order Notes */}
                {orderNotes.trim() && (
                  <div className="mt-3 pt-3 border-t border-dashed border-[#F2EBE7]">
                    <div className="flex items-start gap-2 text-xs text-[#A0705E]">
                      <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{orderNotes}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between mt-4 pt-4 border-t border-[#F2EBE7]">
                  <span className="text-[#A0705E]">Total</span>
                  <span className="font-black text-[#3A1C07] text-lg">
                    ₹{getCartTotal().toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Order Type */}
              <div className="border border-[#F2EBE7] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-[#8B4513]" />
                    <h3 className="font-bold text-[#3A1C07]">Order Type</h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowCheckout(false);
                      setShowCart(true);
                    }}
                    className="text-[#8B4513] text-sm font-bold hover:underline"
                  >
                    Change
                  </button>
                </div>
                <div className="bg-[#FAF7F5] rounded-xl p-4 flex items-center gap-3">
                  <div className="text-[#3A1C07]">
                    {ORDER_TYPE_OPTIONS.find((o) => o.type === orderType)?.icon}
                  </div>
                  <div>
                    <div className="font-bold text-[#3A1C07]">
                      {
                        ORDER_TYPE_OPTIONS.find((o) => o.type === orderType)
                          ?.label
                      }
                    </div>
                    <div className="text-xs text-[#A0705E]">
                      {
                        ORDER_TYPE_OPTIONS.find((o) => o.type === orderType)
                          ?.description
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="border border-[#F2EBE7] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-[#8B4513]" />
                  <h3 className="font-bold text-[#3A1C07]">
                    Customer Information
                  </h3>
                </div>

                {mode === "logged-in" && user ? (
                  <div className="space-y-2 text-[#A0705E]">
                    <div className="text-[#3A1C07] font-medium">
                      {user.name}
                    </div>
                    <div className="text-sm">{user.email}</div>
                    {user.phone && <div className="text-sm">{user.phone}</div>}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-[#A0705E] mb-1 block font-medium">
                          First Name <span className="text-[#C2372E]">*</span>
                        </label>
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className="w-full px-4 py-3 bg-[#FAF7F5] border border-[#F2EBE7] rounded-xl text-[#3A1C07] placeholder-[#D4B9AD] focus:outline-none focus:border-[#8B4513] focus:ring-1 focus:ring-[#8B4513]"
                          placeholder="Enter name"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#A0705E] mb-1 block font-medium">
                          Phone Number <span className="text-[#C2372E]">*</span>
                        </label>
                        <input
                          type="tel"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          className="w-full px-4 py-3 bg-[#FAF7F5] border border-[#F2EBE7] rounded-xl text-[#3A1C07] placeholder-[#D4B9AD] focus:outline-none focus:border-[#8B4513] focus:ring-1 focus:ring-[#8B4513]"
                          placeholder="(555) 000-0000"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[#D4B9AD] flex items-center gap-1">
                      <span>💬</span> We&apos;ll text you when your order is
                      ready.
                    </p>
                  </div>
                )}
              </div>

              {checkoutError && (
                <div className="text-[#C2372E] text-center p-3 bg-red-50 rounded-xl border border-red-100">
                  {checkoutError}
                </div>
              )}
            </div>

            {/* Place Order Button */}
            <div className="p-6 pt-0">
              <button
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
                className="w-full py-4 bg-[#8B4513] hover:bg-[#6F370F] disabled:bg-[#D4B9AD] disabled:text-white rounded-2xl text-white font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                {isPlacingOrder ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <span>Place Order</span>
                    <Check className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
