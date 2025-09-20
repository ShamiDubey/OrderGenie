"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  getAdminUserRecommendations,
  refreshUserRecommendations,
  AdminUserDetail,
} from "@/lib/api";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function AdminUserRecommendationsPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!params.id) return;
    setLoading(true);
    const result = await getAdminUserRecommendations(params.id as string);
    if (result.success && result.data) {
      setData(result.data);
    } else {
      setError(result.error || "Failed to load user data");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const handleRefresh = async () => {
    if (!params.id) return;
    setRefreshing(true);
    const result = await refreshUserRecommendations(params.id as string);
    if (result.success) {
      fetchData();
    }
    setRefreshing(false);
  };

  const getVegLabel = (vegPref: number) => {
    if (vegPref >= 0.8)
      return { text: "Vegetarian", color: "bg-green-100 text-green-700" };
    if (vegPref >= 0.5)
      return { text: "Flexitarian", color: "bg-yellow-100 text-yellow-700" };
    return { text: "Non-Vegetarian", color: "bg-red-100 text-red-700" };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-500 text-lg mb-4">
            {error || "User not found"}
          </p>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const vegLabel = data.preferences
    ? getVegLabel(data.preferences.vegPreference)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <Link
            href="/admin/recommendations"
            className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 mb-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Recommendations
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 font-bold text-2xl">
                {data.profile.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {data.profile.name}
              </h1>
              <p className="text-gray-500">{data.profile.email}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
        >
          {refreshing ? (
            <LoadingSpinner size="sm" />
          ) : (
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
          Refresh Recommendations
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preferences Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            User Preferences
          </h2>
          {data.preferences ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Diet Preference</p>
                <span
                  className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${vegLabel?.color}`}
                >
                  {vegLabel?.text}
                </span>
                <p className="text-xs text-gray-400 mt-1">
                  {(data.preferences.vegPreference * 100).toFixed(0)}%
                  vegetarian items
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Price Range</p>
                <p className="font-medium text-gray-800 capitalize">
                  {data.preferences.priceRange}
                </p>
                <p className="text-xs text-gray-400">
                  Avg order: ₹
                  {parseFloat(data.preferences.avgOrderValue).toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="font-medium text-gray-800">
                  {data.preferences.totalOrders}
                </p>
                {data.preferences.lastOrderAt && (
                  <p className="text-xs text-gray-400">
                    Last:{" "}
                    {new Date(
                      data.preferences.lastOrderAt
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>

              {Object.keys(data.preferences.categoryAffinities || {}).length >
                0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Top Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.preferences.categoryAffinities)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([category, score]) => (
                        <span
                          key={category}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                        >
                          {category}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {Object.keys(data.preferences.tagAffinities || {}).length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Favorite Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.preferences.tagAffinities)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 8)
                      .map(([tag, score]) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <p>No preferences analyzed yet</p>
              <p className="text-xs mt-1">User needs to place orders first</p>
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Recent Orders
          </h2>
          {data.recentOrders.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {data.recentOrders.map((order) => (
                <div key={order.id} className="border-b pb-3 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">
                        ₹{parseFloat(order.grandTotal).toFixed(2)}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          order.status === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : order.status === "CANCELLED"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <p
                        key={idx}
                        className="text-xs text-gray-500 flex items-center gap-1"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.isVeg ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        {item.productName} x{item.quantity}
                      </p>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs text-gray-400">
                        +{order.items.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>No orders yet</p>
            </div>
          )}
        </div>

        {/* Cache Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Cache Status
          </h2>
          {data.cacheInfo ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    data.cacheInfo.isExpired ? "bg-red-500" : "bg-green-500"
                  }`}
                />
                <span className="font-medium text-gray-800">
                  {data.cacheInfo.isExpired ? "Cache Expired" : "Cache Active"}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium text-gray-800">
                  {new Date(data.cacheInfo.createdAt).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Expires</p>
                <p className="font-medium text-gray-800">
                  {new Date(data.cacheInfo.expiresAt).toLocaleString()}
                </p>
              </div>

              {data.cacheInfo.aiInsights && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">AI Insights</p>
                  <p className="text-sm text-gray-700 bg-orange-50 p-3 rounded">
                    {data.cacheInfo.aiInsights}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>No cache available</p>
              <p className="text-xs mt-1">Click refresh to generate</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Generated Recommendations
        </h2>
        {data.recommendations?.recommendations &&
        data.recommendations.recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {data.recommendations.recommendations.map((rec, index) => (
              <div
                key={rec.product.id}
                className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative h-32 bg-gray-100">
                  {rec.product.thumbnail_url || rec.product.image_url ? (
                    <Image
                      src={rec.product.thumbnail_url || rec.product.image_url!}
                      alt={rec.product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {index + 1}
                  </div>
                  {rec.product.is_veg ? (
                    <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                      V
                    </span>
                  ) : (
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
                      N
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-gray-800 text-sm truncate">
                    {rec.product.name}
                  </p>
                  <p className="text-green-600 font-bold text-sm">
                    ₹{rec.product.price}
                  </p>
                  <div className="mt-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        rec.reasonType === "preference"
                          ? "bg-purple-100 text-purple-700"
                          : rec.reasonType === "history"
                          ? "bg-blue-100 text-blue-700"
                          : rec.reasonType === "trending"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {rec.reasonType}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                    {rec.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <svg
              className="w-16 h-16 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <p>No recommendations generated</p>
            <p className="text-sm mt-1">
              Click "Refresh Recommendations" to generate
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
