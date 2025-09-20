'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getAdminRecommendationStats,
  getAdminRecommendationUsers,
  refreshUserRecommendations,
  cleanupRecommendationCache,
  AdminRecommendationStats,
  AdminUserSummary,
} from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Pagination } from '@/types';

export default function AdminRecommendationsPage() {
  const [stats, setStats] = useState<AdminRecommendationStats | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [refreshingUser, setRefreshingUser] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [cleaningCache, setCleaningCache] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [statsRes, usersRes] = await Promise.all([
      getAdminRecommendationStats(),
      getAdminRecommendationUsers(page, 15),
    ]);

    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }
    if (usersRes.success && usersRes.data) {
      setUsers(usersRes.data);
      if (usersRes.pagination) {
        setPagination(usersRes.pagination);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleRefreshUser = async (profileId: string) => {
    setRefreshingUser(profileId);
    setMessage(null);
    const result = await refreshUserRecommendations(profileId);
    if (result.success) {
      setMessage({ type: 'success', text: result.data?.message || 'Recommendations refreshed' });
      fetchData();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to refresh' });
    }
    setRefreshingUser(null);
  };

  const handleRefreshTrending = async () => {
    setRefreshingAll(true);
    setMessage(null);
    const result = await refreshUserRecommendations();
    if (result.success) {
      setMessage({ type: 'success', text: result.data?.message || 'Trending refreshed' });
      fetchData();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to refresh' });
    }
    setRefreshingAll(false);
  };

  const handleCleanupCache = async () => {
    setCleaningCache(true);
    setMessage(null);
    const result = await cleanupRecommendationCache();
    if (result.success) {
      setMessage({ type: 'success', text: result.data?.message || 'Cache cleaned' });
      fetchData();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to clean cache' });
    }
    setCleaningCache(false);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const getVegLabel = (vegPref: number) => {
    if (vegPref >= 0.8) return { text: 'Vegetarian', color: 'text-green-600' };
    if (vegPref >= 0.5) return { text: 'Flexitarian', color: 'text-yellow-600' };
    return { text: 'Non-Veg', color: 'text-red-600' };
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">AI Recommendations</h1>
        <div className="flex gap-3">
          <button
            onClick={handleRefreshTrending}
            disabled={refreshingAll}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
          >
            {refreshingAll ? (
              <LoadingSpinner size="sm" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Refresh Trending
          </button>
          <button
            onClick={handleCleanupCache}
            disabled={cleaningCache}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
          >
            {cleaningCache ? (
              <LoadingSpinner size="sm" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
            Cleanup Cache
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-gray-500 text-sm">Total Users</p>
            <p className="text-2xl font-bold text-gray-800">{stats.users.total}</p>
            <p className="text-xs text-gray-400 mt-1">
              {stats.users.withPreferences} with preferences
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-gray-500 text-sm">Users Analyzed</p>
            <p className="text-2xl font-bold text-green-600">{stats.users.withPreferences}</p>
            <p className="text-xs text-gray-400 mt-1">
              {stats.users.withoutPreferences} pending
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-gray-500 text-sm">Active Cache</p>
            <p className="text-2xl font-bold text-blue-600">{stats.cache.active}</p>
            <p className="text-xs text-gray-400 mt-1">
              {stats.cache.expired} expired
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-gray-500 text-sm">Trending Status</p>
            {stats.trending ? (
              <>
                <p className={`text-2xl font-bold ${stats.trending.isExpired ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.trending.isExpired ? 'Expired' : 'Active'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {stats.trending.productCount} products
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold text-gray-400">Not Set</p>
            )}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">User Preferences & Recommendations</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">User</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Orders</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Preference</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Price Range</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Cache</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => {
              const vegLabel = user.preferences ? getVegLabel(user.preferences.vegPreference) : null;

              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">{user.orderCount}</span>
                    {user.preferences?.lastOrderAt && (
                      <p className="text-xs text-gray-400">
                        Last: {new Date(user.preferences.lastOrderAt).toLocaleDateString()}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {vegLabel ? (
                      <span className={`font-medium ${vegLabel.color}`}>
                        {vegLabel.text}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.preferences?.priceRange ? (
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700 capitalize">
                        {user.preferences.priceRange}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.cacheStatus.hasCache ? (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.cacheStatus.isExpired
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {user.cacheStatus.isExpired ? 'Expired' : 'Active'}
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        None
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/recommendations/${user.id}`}
                        className="text-blue-600 hover:text-blue-800 p-2"
                        title="View Details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => handleRefreshUser(user.id)}
                        disabled={refreshingUser === user.id}
                        className="text-orange-600 hover:text-orange-800 p-2 disabled:opacity-50"
                        title="Refresh Recommendations"
                      >
                        {refreshingUser === user.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No users with order history found</p>
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
