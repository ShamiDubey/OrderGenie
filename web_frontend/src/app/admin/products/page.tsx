'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getProducts, deleteProduct, toggleProductAvailability } from '@/lib/api';
import { Product, Pagination } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    // Pass available: 'all' to include both available and unavailable products in admin
    const result = await getProducts({ page, limit: 20, available: 'all' });
    if (result.success && result.data) {
      setProducts(result.data);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [page]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setDeleting(id);
    const result = await deleteProduct(id);
    if (result.success) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert(result.error || 'Failed to delete product');
    }
    setDeleting(null);
  };

  const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
    setToggling(id);
    const result = await toggleProductAvailability(id, !currentStatus);
    if (result.success) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isAvailable: !currentStatus } : p))
      );
    } else {
      alert(result.error || 'Failed to update availability');
    }
    setToggling(null);
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Manage Products</h1>
        <Link
          href="/admin/products/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </Link>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Product</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Category</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Price</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 bg-gray-100 rounded">
                      {product.thumbnailUrl ? (
                        <Image
                          src={product.thumbnailUrl}
                          alt={product.name}
                          fill
                          className="object-cover rounded"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{product.name}</p>
                      <div className="flex gap-1">
                        {product.isVeg ? (
                          <span className="text-xs text-green-600">Veg</span>
                        ) : (
                          <span className="text-xs text-red-600">Non-Veg</span>
                        )}
                        {product.isFeatured && (
                          <span className="text-xs text-yellow-600">Featured</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {product.category?.name || '-'}
                </td>
                <td className="px-4 py-3">
                  <div>
                    <span className="font-medium text-gray-800">
                      ₹{Number(product.effectivePrice).toFixed(2)}
                    </span>
                    {product.hasActiveDiscount && (
                      <span className="text-xs text-gray-400 line-through ml-2">
                        ₹{parseFloat(product.price).toFixed(2)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAvailability(product.id, product.isAvailable)}
                      disabled={toggling === product.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        product.isAvailable ? 'bg-green-500' : 'bg-gray-300'
                      } ${toggling === product.id ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          product.isAvailable ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-xs font-medium ${
                      product.isAvailable ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      {product.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="text-blue-600 hover:text-blue-800 p-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      disabled={deleting === product.id}
                      className="text-red-600 hover:text-red-800 p-2 disabled:opacity-50"
                    >
                      {deleting === product.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found</p>
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
