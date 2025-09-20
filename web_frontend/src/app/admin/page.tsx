"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getProducts,
  getCategories,
  getProfiles,
  getAdminRecommendationStats,
  getAdminOrders,
} from "@/lib/api";
import { getEmployees } from "@/lib/employee-api";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Stats {
  products: number;
  categories: number;
  profiles: number;
  employees: number;
  orders: {
    total: number;
    pending: number;
  };
  recommendations: {
    usersWithPreferences: number;
    activeCache: number;
  };
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats>({
    products: 0,
    categories: 0,
    profiles: 0,
    employees: 0,
    orders: { total: 0, pending: 0 },
    recommendations: { usersWithPreferences: 0, activeCache: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      const [
        productsRes,
        categoriesRes,
        profilesRes,
        employeesRes,
        ordersRes,
        pendingOrdersRes,
        recsRes,
      ] = await Promise.all([
        getProducts({ limit: 1 }),
        getCategories(),
        getProfiles(),
        getEmployees(),
        getAdminOrders({ limit: 1 }),
        getAdminOrders({ status: "PENDING", limit: 1 }),
        getAdminRecommendationStats(),
      ]);

      setStats({
        products: productsRes.pagination?.total || 0,
        categories: categoriesRes.data?.length || 0,
        profiles: profilesRes.data?.length || 0,
        employees: employeesRes.data?.length || 0,
        orders: {
          total: ordersRes.pagination?.total || 0,
          pending: pendingOrdersRes.pagination?.total || 0,
        },
        recommendations: {
          usersWithPreferences: recsRes.data?.users.withPreferences || 0,
          activeCache: recsRes.data?.cache.active || 0,
        },
      });
      setLoading(false);
    }
    fetchStats();
  }, []);

  const adminCards = [
    {
      title: "Orders",
      count: stats.orders.total,
      subtitle:
        stats.orders.pending > 0
          ? `${stats.orders.pending} pending`
          : undefined,
      href: "/admin/orders",
      color: "bg-red-500",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
    {
      title: "Products",
      count: stats.products,
      href: "/admin/products",
      color: "bg-blue-500",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
    },
    {
      title: "Categories",
      count: stats.categories,
      href: "/admin/categories",
      color: "bg-green-500",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      title: "Face Profiles",
      count: stats.profiles,
      href: "/admin/profiles",
      color: "bg-purple-500",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      title: "Employees",
      count: stats.employees,
      href: "/admin/employees",
      color: "bg-amber-500",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
          />
        </svg>
      ),
    },
    {
      title: "AI Recommendations",
      count: stats.recommendations.usersWithPreferences,
      subtitle: `${stats.recommendations.activeCache} cached`,
      href: "/admin/recommendations",
      color: "bg-orange-500",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {adminCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {card.count}
                  </p>
                  {"subtitle" in card && card.subtitle && (
                    <p className="text-xs text-gray-400 mt-1">
                      {card.subtitle}
                    </p>
                  )}
                </div>
                <div className={`${card.color} text-white p-3 rounded-lg`}>
                  {card.icon}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/orders"
            className="flex items-center gap-3 p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <div className="bg-red-500 text-white p-2 rounded">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <span className="font-medium text-gray-700">Manage Orders</span>
          </Link>

          <Link
            href="/admin/products/new"
            className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div className="bg-blue-500 text-white p-2 rounded">
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <span className="font-medium text-gray-700">Add Product</span>
          </Link>

          <Link
            href="/admin/categories/new"
            className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <div className="bg-green-500 text-white p-2 rounded">
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <span className="font-medium text-gray-700">Add Category</span>
          </Link>

          <Link
            href="/face"
            className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <div className="bg-purple-500 text-white p-2 rounded">
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <span className="font-medium text-gray-700">Face Recognition</span>
          </Link>

          <Link
            href="/admin/recommendations"
            className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <div className="bg-orange-500 text-white p-2 rounded">
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
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <span className="font-medium text-gray-700">
              View Recommendations
            </span>
          </Link>

          <Link
            href="/admin/employees"
            className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <div className="bg-amber-500 text-white p-2 rounded">
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
                  d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                />
              </svg>
            </div>
            <span className="font-medium text-gray-700">Manage Employees</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
