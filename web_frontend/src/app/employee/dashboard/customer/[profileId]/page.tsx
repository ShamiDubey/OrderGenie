"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEmployee } from "@/context/EmployeeContext";
import {
  getCustomerDetails,
  getCommunicationSuggestions,
  refreshCustomerInsights,
} from "@/lib/employee-api";
import { createOrder } from "@/lib/api";
import { useProductStore } from "@/stores";
import {
  CustomerDetailsForEmployee,
  CommunicationSuggestions,
  InsightMetadata,
  CreateOrderData,
  OrderType,
} from "@/types";
import { NormalizedProduct } from "@/lib/normalizers";
import { formatPoints } from "@/lib/utils";

// Employee cart item type
interface EmployeeCartItem {
  product: NormalizedProduct;
  quantity: number;
}

function LoadingSkeleton() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-surface-container)" }}
    >
      <header
        className="sticky top-0 z-40 px-6 py-4 shadow-sm"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl skeleton" />
          <div className="h-6 w-48 skeleton rounded" />
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="h-64 skeleton rounded-3xl" />
            <div className="h-96 skeleton rounded-3xl" />
          </div>
          <div className="space-y-6">
            <div className="h-48 skeleton rounded-3xl" />
            <div className="h-64 skeleton rounded-3xl" />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, employee } = useEmployee();

  const profileId = params.profileId as string;

  // Customer data state
  const [customerData, setCustomerData] =
    useState<CustomerDetailsForEmployee | null>(null);
  const [communication, setCommunication] =
    useState<CommunicationSuggestions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Order management state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [employeeCart, setEmployeeCart] = useState<EmployeeCartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'products' | 'cart'>('products');

  // Product store
  const {
    categories,
    products,
    fetchCategories,
    fetchProducts,
    getProductsByCategory,
    isLoadingCategories,
    isLoadingProducts,
  } = useProductStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/employee");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch customer data
  useEffect(() => {
    if (!profileId || !isAuthenticated) return;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const customerResult = await getCustomerDetails(profileId);

        if (customerResult.success && customerResult.data) {
          setCustomerData(customerResult.data);

          const metadata = customerResult.data
            .insightMetadata as InsightMetadata | null;
          if (metadata?.greetings && metadata.greetings.length > 0) {
            setCommunication({
              openingLines: metadata.greetings || [],
              conversationTopics: metadata.conversationTopics || [],
              specialNotes: metadata.specialNotes || [],
              upsellSuggestions: metadata.upsellSuggestions || [],
            });
          } else {
            const commResult = await getCommunicationSuggestions(profileId);
            if (commResult.success && commResult.data) {
              setCommunication(commResult.data);
            }
          }
        } else {
          setError(customerResult.error || "Failed to load customer data");
        }
      } catch (err) {
        console.error("Error fetching customer data:", err);
        setError("Failed to load customer data");
      }

      setIsLoading(false);
    }

    fetchData();
  }, [profileId, isAuthenticated]);

  // Fetch products and categories
  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [fetchCategories, fetchProducts]);

  // Set default category when categories load
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Get products for selected category
  const filteredProducts = useMemo(() => {
    if (!selectedCategoryId) return [];
    return getProductsByCategory(selectedCategoryId).filter(p => p.isAvailable);
  }, [selectedCategoryId, getProductsByCategory, products]);

  // Cart helper functions
  const addToCart = (product: NormalizedProduct) => {
    setEmployeeCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setEmployeeCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setEmployeeCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const getCartItemQuantity = (productId: string): number => {
    const item = employeeCart.find((item) => item.product.id === productId);
    return item?.quantity || 0;
  };

  const cartTotal = useMemo(() => {
    return employeeCart.reduce(
      (total, item) => total + item.product.effectivePrice * item.quantity,
      0
    );
  }, [employeeCart]);

  const cartItemCount = useMemo(() => {
    return employeeCart.reduce((total, item) => total + item.quantity, 0);
  }, [employeeCart]);

  // Handle place order
  const handlePlaceOrder = async () => {
    if (employeeCart.length === 0 || !customerData) return;

    setIsPlacingOrder(true);
    setOrderError(null);
    setOrderSuccess(null);

    try {
      const orderData: CreateOrderData = {
        profileId: customerData.profile.id,
        employeeId: employee?.id,
        customerName: customerData.profile.name,
        customerEmail: customerData.profile.email,
        notes: orderNotes || undefined,
        orderType,
        items: employeeCart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      const result = await createOrder(orderData);

      if (result.success && result.data) {
        setOrderSuccess(`Order #${result.data.orderNumber} placed successfully!`);
        setEmployeeCart([]);
        setOrderNotes("");
        setOrderType("DINE_IN"); // Reset to default
        setActiveView('products'); // Switch back to products after order
        // Clear success message after 5 seconds
        setTimeout(() => setOrderSuccess(null), 5000);
      } else {
        setOrderError(result.error || "Failed to place order");
      }
    } catch (err) {
      console.error("Error placing order:", err);
      setOrderError("Failed to place order");
    }

    setIsPlacingOrder(false);
  };

  // Handle refresh AI insights
  const handleRefreshInsights = async () => {
    if (!profileId || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const result = await refreshCustomerInsights(profileId);

      if (result.success && result.data) {
        setCustomerData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            aiInsights: result.data?.aiInsight || prev.aiInsights,
            insightMetadata:
              (result.data?.insightMetadata as InsightMetadata) ||
              prev.insightMetadata,
          };
        });

        const metadata = result.data.insightMetadata as InsightMetadata | null;
        if (metadata?.greetings && metadata.greetings.length > 0) {
          setCommunication({
            openingLines: metadata.greetings || [],
            conversationTopics: metadata.conversationTopics || [],
            specialNotes: metadata.specialNotes || [],
            upsellSuggestions: metadata.upsellSuggestions || [],
          });
        }
      }
    } catch (err) {
      console.error("Error refreshing insights:", err);
    }
    setIsRefreshing(false);
  };

  if (authLoading || isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !customerData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-surface-container)" }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: "var(--color-error-container)" }}
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={{ color: "var(--color-on-error-container)" }}
            >
              error
            </span>
          </div>
          <p
            className="text-lg font-medium mb-2"
            style={{ color: "var(--color-on-surface)" }}
          >
            {error || "Customer not found"}
          </p>
          <Link
            href="/employee/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-on-primary)",
            }}
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const {
    profile,
    preferences,
    recentOrders = [],
    recommendations = [],
    aiInsights,
  } = customerData;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-surface-container)" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 px-4 py-3 shadow-sm"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/employee/dashboard"
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
              style={{ backgroundColor: "var(--color-surface-container)" }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: "var(--color-on-surface)" }}
              >
                arrow_back
              </span>
            </Link>
            <div className="flex items-center gap-3">
              {profile.avatarUrl ? (
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={profile.avatarUrl}
                    alt={profile.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: "var(--color-primary-container)",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: "var(--color-on-primary-container)" }}
                  >
                    person
                  </span>
                </div>
              )}
              <div>
                <h1
                  className="font-semibold"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  {profile.name}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-sm">
                    stars
                  </span>
                  <span className="text-sm font-medium text-amber-600">
                    {formatPoints(profile.totalPoints)} pts
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div
            className="text-right text-sm"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Served by: {employee?.name}
          </div>
        </div>
      </header>

      {/* Order Success/Error Messages */}
      {orderSuccess && (
        <div
          className="mx-4 mt-4 p-4 rounded-xl flex items-center gap-3"
          style={{ backgroundColor: "var(--color-tertiary-container)" }}
        >
          <span
            className="material-symbols-outlined"
            style={{ color: "var(--color-on-tertiary-container)" }}
          >
            check_circle
          </span>
          <span style={{ color: "var(--color-on-tertiary-container)" }}>
            {orderSuccess}
          </span>
        </div>
      )}
      {orderError && (
        <div
          className="mx-4 mt-4 p-4 rounded-xl flex items-center gap-3"
          style={{ backgroundColor: "var(--color-error-container)" }}
        >
          <span
            className="material-symbols-outlined"
            style={{ color: "var(--color-on-error-container)" }}
          >
            error
          </span>
          <span style={{ color: "var(--color-on-error-container)" }}>
            {orderError}
          </span>
          <button
            onClick={() => setOrderError(null)}
            className="ml-auto"
            style={{ color: "var(--color-on-error-container)" }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Main Content - Two Column Layout */}
      <main className="p-4 h-[calc(100vh-70px)]">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-full">
          {/* LEFT SIDE - Order Management (3/5 width) */}
          <div className="lg:col-span-3 h-full">
            <div
              className="h-full rounded-3xl shadow-lg overflow-hidden flex"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              {/* Category Strip with Cart at Top */}
              <div
                className="w-20 flex-shrink-0 flex flex-col border-r"
                style={{
                  backgroundColor: "var(--color-surface-container-low)",
                  borderColor: "var(--color-outline-variant)",
                }}
              >
                {/* Cart Button - Fixed at Top */}
                <div className="p-2 flex-shrink-0">
                  <button
                    onClick={() => setActiveView('cart')}
                    className={`w-full p-2 rounded-xl flex flex-col items-center gap-1 transition-all relative ${
                      activeView === 'cart' ? "ring-2" : "hover:opacity-80"
                    }`}
                    style={{
                      backgroundColor:
                        activeView === 'cart'
                          ? "var(--color-primary-container)"
                          : "var(--color-surface-container)",
                      color:
                        activeView === 'cart'
                          ? "var(--color-on-primary-container)"
                          : "var(--color-on-surface-variant)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center relative"
                      style={{
                        backgroundColor:
                          activeView === 'cart'
                            ? "var(--color-primary)"
                            : "var(--color-surface)",
                      }}
                    >
                      <span
                        className="material-symbols-outlined text-lg"
                        style={{
                          color:
                            activeView === 'cart'
                              ? "var(--color-on-primary)"
                              : "var(--color-on-surface-variant)",
                        }}
                      >
                        shopping_cart
                      </span>
                      {/* Badge */}
                      {cartItemCount > 0 && (
                        <span
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                          style={{
                            backgroundColor: "var(--color-error)",
                            color: "var(--color-on-error)",
                          }}
                        >
                          {cartItemCount > 9 ? '9+' : cartItemCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-center">
                      Cart
                    </span>
                  </button>
                </div>

                {/* Divider */}
                <div
                  className="mx-2 border-t"
                  style={{ borderColor: "var(--color-outline-variant)" }}
                />

                {/* Categories - Scrollable */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {isLoadingCategories ? (
                    <>
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-16 skeleton rounded-xl" />
                      ))}
                    </>
                  ) : (
                    categories.map((category) => {
                      const isSelected = selectedCategoryId === category.id && activeView === 'products';
                      return (
                        <button
                          key={category.id}
                          onClick={() => {
                            setSelectedCategoryId(category.id);
                            setActiveView('products');
                          }}
                          className={`w-full p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                            isSelected ? "ring-2" : "hover:opacity-80"
                          }`}
                          style={{
                            backgroundColor: isSelected
                              ? "var(--color-primary-container)"
                              : "transparent",
                            color: isSelected
                              ? "var(--color-on-primary-container)"
                              : "var(--color-on-surface-variant)",
                          }}
                        >
                          {category.imageUrl ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden">
                              <Image
                                src={category.imageUrl}
                                alt={category.name}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{
                                backgroundColor: isSelected
                                  ? "var(--color-primary)"
                                  : "var(--color-surface-container)",
                              }}
                            >
                              <span
                                className="material-symbols-outlined text-lg"
                                style={{
                                  color: isSelected
                                    ? "var(--color-on-primary)"
                                    : "var(--color-on-surface-variant)",
                                }}
                              >
                                restaurant
                              </span>
                            </div>
                          )}
                          <span className="text-[10px] font-medium text-center leading-tight line-clamp-2">
                            {category.name}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Content Area - Switches between Products and Cart */}
              <div className="flex-1 overflow-y-auto">
                {activeView === 'products' ? (
                  /* Product Grid View */
                  <div className="p-3 h-full">
                    {isLoadingProducts ? (
                      <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                          <div key={i} className="aspect-[3/4] skeleton rounded-xl" />
                        ))}
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div
                        className="flex flex-col items-center justify-center h-full"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        <span className="material-symbols-outlined text-4xl mb-2">
                          restaurant_menu
                        </span>
                        <p className="text-sm">No products in this category</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
                        {filteredProducts.map((product) => {
                          const cartQty = getCartItemQuantity(product.id);
                          return (
                            <div
                              key={product.id}
                              className="rounded-xl p-2 relative flex flex-col"
                              style={{
                                backgroundColor: "var(--color-surface-container)",
                              }}
                            >
                              {/* Veg/Non-veg indicator */}
                              <div
                                className="absolute top-1.5 left-1.5 w-3.5 h-3.5 rounded border-2 flex items-center justify-center z-10"
                                style={{
                                  borderColor: product.isVeg ? "#16a34a" : "#dc2626",
                                  backgroundColor: "var(--color-surface)",
                                }}
                              >
                                <div
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{
                                    backgroundColor: product.isVeg
                                      ? "#16a34a"
                                      : "#dc2626",
                                  }}
                                />
                              </div>

                              {/* Product Image */}
                              <div className="w-full aspect-[4/3] rounded-lg overflow-hidden mb-2 bg-gray-100">
                                {product.thumbnailUrl ? (
                                  <Image
                                    src={product.thumbnailUrl}
                                    alt={product.name}
                                    width={120}
                                    height={90}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div
                                    className="w-full h-full flex items-center justify-center"
                                    style={{ backgroundColor: "var(--color-surface)" }}
                                  >
                                    <span
                                      className="material-symbols-outlined text-2xl"
                                      style={{ color: "var(--color-on-surface-variant)" }}
                                    >
                                      restaurant
                                    </span>
                                  </div>
                                )}
                              </div>

                              <p
                                className="font-medium text-xs line-clamp-2 mb-1 flex-1"
                                style={{ color: "var(--color-on-surface)" }}
                              >
                                {product.name}
                              </p>

                              <div className="flex items-center justify-between mt-auto">
                                <div className="flex flex-col">
                                  <span
                                    className="font-semibold text-xs"
                                    style={{ color: "var(--color-primary)" }}
                                  >
                                    Rs.{product.effectivePrice}
                                  </span>
                                  {product.hasActiveDiscount && (
                                    <span
                                      className="text-[10px] line-through"
                                      style={{
                                        color: "var(--color-on-surface-variant)",
                                      }}
                                    >
                                      {product.price}
                                    </span>
                                  )}
                                </div>

                                {cartQty === 0 ? (
                                  <button
                                    onClick={() => addToCart(product)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:opacity-80"
                                    style={{
                                      backgroundColor: "var(--color-primary)",
                                      color: "var(--color-on-primary)",
                                    }}
                                  >
                                    <span className="material-symbols-outlined text-base">
                                      add
                                    </span>
                                  </button>
                                ) : (
                                  <div
                                    className="flex items-center rounded-full"
                                    style={{
                                      backgroundColor: "var(--color-primary-container)",
                                    }}
                                  >
                                    <button
                                      onClick={() =>
                                        updateCartQuantity(product.id, cartQty - 1)
                                      }
                                      className="w-6 h-6 rounded-full flex items-center justify-center"
                                      style={{
                                        color: "var(--color-on-primary-container)",
                                      }}
                                    >
                                      <span className="material-symbols-outlined text-sm">
                                        remove
                                      </span>
                                    </button>
                                    <span
                                      className="text-xs font-semibold min-w-[16px] text-center"
                                      style={{
                                        color: "var(--color-on-primary-container)",
                                      }}
                                    >
                                      {cartQty}
                                    </span>
                                    <button
                                      onClick={() =>
                                        updateCartQuantity(product.id, cartQty + 1)
                                      }
                                      className="w-6 h-6 rounded-full flex items-center justify-center"
                                      style={{
                                        color: "var(--color-on-primary-container)",
                                      }}
                                    >
                                      <span className="material-symbols-outlined text-sm">
                                        add
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Cart View */
                  <div className="p-4 h-full flex flex-col">
                    {/* Cart Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h3
                        className="font-semibold flex items-center gap-2"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        <span className="material-symbols-outlined">shopping_cart</span>
                        Your Order ({cartItemCount} items)
                      </h3>
                      {employeeCart.length > 0 && (
                        <button
                          onClick={() => setEmployeeCart([])}
                          className="text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                          style={{
                            backgroundColor: "var(--color-error-container)",
                            color: "var(--color-on-error-container)",
                          }}
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {employeeCart.length === 0 ? (
                      <div
                        className="flex-1 flex flex-col items-center justify-center"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        <span className="material-symbols-outlined text-5xl mb-3">
                          shopping_cart
                        </span>
                        <p className="text-sm mb-1">Your cart is empty</p>
                        <p className="text-xs">Tap on a category to add products</p>
                      </div>
                    ) : (
                      <>
                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                          {employeeCart.map((item) => (
                            <div
                              key={item.product.id}
                              className="flex items-center gap-3 p-3 rounded-xl"
                              style={{
                                backgroundColor: "var(--color-surface-container)",
                              }}
                            >
                              {/* Veg/Non-veg indicator */}
                              <div
                                className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                                style={{
                                  borderColor: item.product.isVeg
                                    ? "#16a34a"
                                    : "#dc2626",
                                }}
                              >
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor: item.product.isVeg
                                      ? "#16a34a"
                                      : "#dc2626",
                                  }}
                                />
                              </div>

                              {/* Product Name */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className="font-medium text-sm truncate"
                                  style={{ color: "var(--color-on-surface)" }}
                                >
                                  {item.product.name}
                                </p>
                                <p
                                  className="text-xs"
                                  style={{ color: "var(--color-on-surface-variant)" }}
                                >
                                  Rs. {item.product.effectivePrice} each
                                </p>
                              </div>

                              {/* Quantity Controls */}
                              <div
                                className="flex items-center gap-1 rounded-full px-1"
                                style={{
                                  backgroundColor: "var(--color-surface)",
                                }}
                              >
                                <button
                                  onClick={() =>
                                    updateCartQuantity(
                                      item.product.id,
                                      item.quantity - 1
                                    )
                                  }
                                  className="w-7 h-7 rounded-full flex items-center justify-center"
                                  style={{ color: "var(--color-primary)" }}
                                >
                                  <span className="material-symbols-outlined text-lg">
                                    remove
                                  </span>
                                </button>
                                <span
                                  className="text-sm font-semibold min-w-[24px] text-center"
                                  style={{ color: "var(--color-on-surface)" }}
                                >
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateCartQuantity(
                                      item.product.id,
                                      item.quantity + 1
                                    )
                                  }
                                  className="w-7 h-7 rounded-full flex items-center justify-center"
                                  style={{ color: "var(--color-primary)" }}
                                >
                                  <span className="material-symbols-outlined text-lg">
                                    add
                                  </span>
                                </button>
                              </div>

                              {/* Item Total */}
                              <span
                                className="text-sm font-semibold min-w-[60px] text-right"
                                style={{ color: "var(--color-primary)" }}
                              >
                                Rs. {(item.product.effectivePrice * item.quantity).toFixed(0)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Special Notes */}
                        <div className="mb-4">
                          <label
                            className="block text-sm font-medium mb-2"
                            style={{ color: "var(--color-on-surface)" }}
                          >
                            Special Instructions
                          </label>
                          <textarea
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                            placeholder="e.g., less sugar, extra hot, no ice..."
                            rows={2}
                            className="w-full px-3 py-2 rounded-xl text-sm resize-none"
                            style={{
                              backgroundColor: "var(--color-surface-container)",
                              color: "var(--color-on-surface)",
                              border: "1px solid var(--color-outline-variant)",
                            }}
                          />
                        </div>

                        {/* Order Type Selection */}
                        <div className="mb-4">
                          <label
                            className="block text-sm font-medium mb-2"
                            style={{ color: "var(--color-on-surface)" }}
                          >
                            Order Type
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setOrderType("DINE_IN")}
                              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                                orderType === "DINE_IN" ? "ring-2" : ""
                              }`}
                              style={{
                                backgroundColor:
                                  orderType === "DINE_IN"
                                    ? "var(--color-primary-container)"
                                    : "var(--color-surface-container)",
                                color:
                                  orderType === "DINE_IN"
                                    ? "var(--color-on-primary-container)"
                                    : "var(--color-on-surface-variant)",
                              }}
                            >
                              <span className="material-symbols-outlined text-xl">
                                restaurant
                              </span>
                              <span className="text-xs font-medium">Dine In</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderType("PICKUP")}
                              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                                orderType === "PICKUP" ? "ring-2" : ""
                              }`}
                              style={{
                                backgroundColor:
                                  orderType === "PICKUP"
                                    ? "var(--color-secondary-container)"
                                    : "var(--color-surface-container)",
                                color:
                                  orderType === "PICKUP"
                                    ? "var(--color-on-secondary-container)"
                                    : "var(--color-on-surface-variant)",
                              }}
                            >
                              <span className="material-symbols-outlined text-xl">
                                shopping_bag
                              </span>
                              <span className="text-xs font-medium">Pickup</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderType("TAKEAWAY")}
                              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                                orderType === "TAKEAWAY" ? "ring-2" : ""
                              }`}
                              style={{
                                backgroundColor:
                                  orderType === "TAKEAWAY"
                                    ? "var(--color-tertiary-container)"
                                    : "var(--color-surface-container)",
                                color:
                                  orderType === "TAKEAWAY"
                                    ? "var(--color-on-tertiary-container)"
                                    : "var(--color-on-surface-variant)",
                              }}
                            >
                              <span className="material-symbols-outlined text-xl">
                                drive_eta
                              </span>
                              <span className="text-xs font-medium">Takeaway</span>
                            </button>
                          </div>
                        </div>

                        {/* Order Summary */}
                        <div
                          className="p-4 rounded-xl mb-4"
                          style={{ backgroundColor: "var(--color-surface-container)" }}
                        >
                          <div className="flex justify-between mb-2">
                            <span
                              className="text-sm"
                              style={{ color: "var(--color-on-surface-variant)" }}
                            >
                              Subtotal ({cartItemCount} items)
                            </span>
                            <span
                              className="text-sm font-medium"
                              style={{ color: "var(--color-on-surface)" }}
                            >
                              Rs. {cartTotal.toFixed(0)}
                            </span>
                          </div>
                          <div
                            className="flex justify-between pt-2 border-t"
                            style={{ borderColor: "var(--color-outline-variant)" }}
                          >
                            <span
                              className="font-semibold"
                              style={{ color: "var(--color-on-surface)" }}
                            >
                              Total
                            </span>
                            <span
                              className="text-xl font-bold"
                              style={{ color: "var(--color-primary)" }}
                            >
                              Rs. {cartTotal.toFixed(0)}
                            </span>
                          </div>
                        </div>

                        {/* Place Order Button */}
                        <button
                          onClick={handlePlaceOrder}
                          disabled={isPlacingOrder || employeeCart.length === 0}
                          className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                          style={{
                            backgroundColor: "var(--color-primary)",
                            color: "var(--color-on-primary)",
                          }}
                        >
                          {isPlacingOrder ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-lg">
                                progress_activity
                              </span>
                              Placing Order...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-lg">
                                send
                              </span>
                              Place Order - Rs. {cartTotal.toFixed(0)}
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Customer Info (2/5 width) */}
          <div className="lg:col-span-2 space-y-4 overflow-y-auto h-full">
            {/* Compact Profile Card */}
            <div
              className="rounded-3xl p-4 shadow-lg"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              {/* Customer Stats */}
              <div className="grid grid-cols-4 gap-2">
                <div
                  className="p-2 rounded-xl text-center"
                  style={{ backgroundColor: "var(--color-surface-container)" }}
                >
                  <p
                    className="text-lg font-bold"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {preferences?.totalOrders || 0}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Orders
                  </p>
                </div>
                <div
                  className="p-2 rounded-xl text-center"
                  style={{ backgroundColor: "var(--color-surface-container)" }}
                >
                  <p
                    className="text-lg font-bold"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Rs.
                    {preferences?.avgOrderValue
                      ? parseFloat(preferences.avgOrderValue).toFixed(0)
                      : "0"}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Avg
                  </p>
                </div>
                <div
                  className="p-2 rounded-xl text-center"
                  style={{ backgroundColor: "var(--color-surface-container)" }}
                >
                  <p
                    className="text-lg font-bold"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {preferences
                      ? preferences.vegPreference > 0.7
                        ? "Veg"
                        : preferences.vegPreference < 0.3
                        ? "NV"
                        : "Mix"
                      : "-"}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Diet
                  </p>
                </div>
                <div
                  className="p-2 rounded-xl text-center"
                  style={{ backgroundColor: "var(--color-surface-container)" }}
                >
                  <p
                    className="text-lg font-bold capitalize"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {preferences?.priceRange?.charAt(0).toUpperCase() || "-"}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Budget
                  </p>
                </div>
              </div>
            </div>

            {/* AI Insights Card */}
            <div
              className="rounded-3xl p-4 shadow-lg"
              style={{ backgroundColor: "var(--color-primary-container)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3
                  className="font-semibold flex items-center gap-2 text-sm"
                  style={{ color: "var(--color-on-primary-container)" }}
                >
                  <span className="material-symbols-outlined text-lg">
                    psychology
                  </span>
                  AI Insight
                </h3>
                <button
                  onClick={handleRefreshInsights}
                  disabled={isRefreshing}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-on-primary)",
                  }}
                >
                  <span
                    className={`material-symbols-outlined text-sm ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  >
                    {isRefreshing ? "progress_activity" : "refresh"}
                  </span>
                </button>
              </div>
              {aiInsights ? (
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-on-primary-container)" }}
                >
                  {aiInsights}
                </p>
              ) : (
                <p
                  className="text-xs italic"
                  style={{
                    color: "var(--color-on-primary-container)",
                    opacity: 0.7,
                  }}
                >
                  No AI insight available. Click refresh to generate.
                </p>
              )}
            </div>

            {/* Communication Suggestions */}
            {communication && (
              <div
                className="rounded-3xl p-4 shadow-lg"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <h3
                  className="font-semibold mb-3 flex items-center gap-2 text-sm"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  <span className="material-symbols-outlined text-lg">
                    record_voice_over
                  </span>
                  How to Greet {profile.name.split(" ")[0]}
                </h3>

                {/* Primary Greeting */}
                {communication.openingLines.length > 0 && (
                  <div
                    className="p-3 rounded-xl mb-3"
                    style={{
                      backgroundColor: "var(--color-secondary-container)",
                    }}
                  >
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--color-on-secondary-container)" }}
                    >
                      "{communication.openingLines[0]}"
                    </p>
                  </div>
                )}

                {/* Conversation Topics */}
                {communication.conversationTopics.length > 0 && (
                  <div className="mb-3">
                    <p
                      className="text-xs font-medium mb-2"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      Talk About:
                    </p>
                    <div className="space-y-1">
                      {communication.conversationTopics.slice(0, 2).map((topic, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg text-xs"
                          style={{
                            backgroundColor: "var(--color-surface-container)",
                            color: "var(--color-on-surface)",
                          }}
                        >
                          {topic}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Special Notes */}
                {communication.specialNotes.length > 0 && (
                  <div
                    className="p-3 rounded-xl"
                    style={{
                      backgroundColor: "var(--color-tertiary-container)",
                    }}
                  >
                    <p
                      className="text-xs font-semibold mb-1"
                      style={{ color: "var(--color-on-tertiary-container)" }}
                    >
                      Remember:
                    </p>
                    {communication.specialNotes.slice(0, 2).map((note, i) => (
                      <p
                        key={i}
                        className="text-xs"
                        style={{ color: "var(--color-on-tertiary-container)" }}
                      >
                        - {note}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Product Recommendations */}
            <div
              className="rounded-3xl p-4 shadow-lg"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <h3
                className="font-semibold mb-3 flex items-center gap-2 text-sm"
                style={{ color: "var(--color-on-surface)" }}
              >
                <span className="material-symbols-outlined text-lg">
                  recommend
                </span>
                Suggest These
              </h3>

              {recommendations.length === 0 ? (
                <p
                  className="text-center py-4 text-xs"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  No recommendations yet
                </p>
              ) : (
                <div className="space-y-2">
                  {recommendations.slice(0, 4).map((rec, i) => (
                    <div
                      key={rec.product.id}
                      className="p-3 rounded-xl flex items-center gap-3"
                      style={{
                        backgroundColor:
                          i === 0
                            ? "var(--color-secondary-container)"
                            : "var(--color-surface-container)",
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                        style={{
                          borderColor: rec.product.isVeg ? "#16a34a" : "#dc2626",
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: rec.product.isVeg
                              ? "#16a34a"
                              : "#dc2626",
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-medium text-sm truncate"
                          style={{
                            color:
                              i === 0
                                ? "var(--color-on-secondary-container)"
                                : "var(--color-on-surface)",
                          }}
                        >
                          {rec.product.name}
                        </p>
                        <p
                          className="text-xs italic truncate"
                          style={{
                            color:
                              i === 0
                                ? "var(--color-on-secondary-container)"
                                : "var(--color-on-surface-variant)",
                          }}
                        >
                          {rec.reason}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          // Find product in store and add to cart
                          const product = products.find(
                            (p) => p.id === rec.product.id
                          );
                          if (product) addToCart(product);
                        }}
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: "var(--color-primary)",
                          color: "var(--color-on-primary)",
                        }}
                      >
                        <span className="material-symbols-outlined text-sm">
                          add
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Orders */}
            <div
              className="rounded-3xl p-4 shadow-lg"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <h3
                className="font-semibold mb-3 flex items-center gap-2 text-sm"
                style={{ color: "var(--color-on-surface)" }}
              >
                <span className="material-symbols-outlined text-lg">
                  receipt_long
                </span>
                Recent Orders
              </h3>

              {recentOrders.length === 0 ? (
                <p
                  className="text-center py-4 text-xs"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  No previous orders
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recentOrders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="p-3 rounded-xl"
                      style={{
                        backgroundColor: "var(--color-surface-container)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="font-medium text-sm"
                          style={{ color: "var(--color-on-surface)" }}
                        >
                          #{order.orderNumber}
                        </span>
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--color-primary)" }}
                        >
                          Rs. {order.grandTotal}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {order.items.slice(0, 2).map((item, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                            style={{
                              backgroundColor: "var(--color-surface)",
                              color: "var(--color-on-surface-variant)",
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-sm border"
                              style={{
                                borderColor: item.isVeg ? "#16a34a" : "#dc2626",
                                backgroundColor: item.isVeg
                                  ? "#16a34a"
                                  : "#dc2626",
                              }}
                            />
                            {item.quantity}x {item.productName}
                          </span>
                        ))}
                        {order.items.length > 2 && (
                          <span
                            className="text-[10px] px-1"
                            style={{ color: "var(--color-on-surface-variant)" }}
                          >
                            +{order.items.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
