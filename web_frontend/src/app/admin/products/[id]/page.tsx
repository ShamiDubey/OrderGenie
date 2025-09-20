'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { getProductById, updateProduct, getCategories } from '@/lib/api';
import { Category } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    discountedPrice: '',
    discountEnds: '',
    isVeg: true,
    tags: '',
    categoryId: '',
    preparationTime: '',
    calories: '',
    servingSize: '',
    isAvailable: true,
    isFeatured: false,
    displayOrder: '0',
    royaltyPoints: '50',
    image: null as File | null,
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [productRes, categoriesRes] = await Promise.all([
        getProductById(params.id as string),
        getCategories(),
      ]);

      if (productRes.success && productRes.data) {
        const p = productRes.data;
        setForm({
          name: p.name,
          description: p.description || '',
          price: p.price,
          discountedPrice: p.discountedPrice || '',
          discountEnds: p.discountEnds ? p.discountEnds.split('T')[0] : '',
          isVeg: p.isVeg,
          tags: p.tags.join(', '),
          categoryId: p.categoryId || '',
          preparationTime: p.preparationTime?.toString() || '',
          calories: p.calories?.toString() || '',
          servingSize: p.servingSize || '',
          isAvailable: p.isAvailable,
          isFeatured: p.isFeatured,
          displayOrder: p.displayOrder.toString(),
          royaltyPoints: p.royaltyPoints?.toString() || '50',
          image: null,
        });
        if (p.imageUrl) {
          setPreview(p.imageUrl);
        }
      } else {
        setError('Product not found');
      }

      if (categoriesRes.success && categoriesRes.data) {
        setCategories(categoriesRes.data);
      }
      setLoading(false);
    }
    fetchData();
  }, [params.id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, image: file }));
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await updateProduct(params.id as string, {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      discountedPrice: form.discountedPrice ? parseFloat(form.discountedPrice) : undefined,
      discountEnds: form.discountEnds || undefined,
      isVeg: form.isVeg,
      tags: form.tags,
      categoryId: form.categoryId || undefined,
      preparationTime: form.preparationTime ? parseInt(form.preparationTime, 10) : undefined,
      calories: form.calories ? parseInt(form.calories, 10) : undefined,
      servingSize: form.servingSize || undefined,
      isAvailable: form.isAvailable,
      isFeatured: form.isFeatured,
      displayOrder: parseInt(form.displayOrder, 10),
      royaltyPoints: parseInt(form.royaltyPoints, 10),
      image: form.image || undefined,
    });

    if (result.success) {
      router.push('/admin/products');
    } else {
      setError(result.error || 'Failed to update product');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !form.name) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <button onClick={() => router.back()} className="text-blue-600 hover:underline">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Edit Product</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Discounted Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discounted Price</label>
            <input
              type="number"
              name="discountedPrice"
              value={form.discountedPrice}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Discount Ends */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Ends</label>
            <input
              type="date"
              name="discountEnds"
              value={form.discountEnds}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <input
              type="text"
              name="tags"
              value={form.tags}
              onChange={handleChange}
              placeholder="comma,separated,tags"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Preparation Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preparation Time (min)
            </label>
            <input
              type="number"
              name="preparationTime"
              value={form.preparationTime}
              onChange={handleChange}
              min="0"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Calories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calories</label>
            <input
              type="number"
              name="calories"
              value={form.calories}
              onChange={handleChange}
              min="0"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Serving Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Serving Size</label>
            <input
              type="text"
              name="servingSize"
              value={form.servingSize}
              onChange={handleChange}
              placeholder="e.g., 1 plate"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
            <input
              type="number"
              name="displayOrder"
              value={form.displayOrder}
              onChange={handleChange}
              min="0"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Royalty Points */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Royalty Points
              <span className="text-xs text-gray-500 ml-1">(earned on purchase)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                name="royaltyPoints"
                value={form.royaltyPoints}
                onChange={handleChange}
                min="0"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 pr-12"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-amber-500">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <div className="relative w-32 h-32 mx-auto">
                  <Image src={preview} alt="Preview" fill className="object-cover rounded-lg" />
                </div>
              ) : (
                <div className="text-gray-500">
                  <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-sm">Click to upload new image</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="md:col-span-2 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isVeg"
                checked={form.isVeg}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span>Vegetarian</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isAvailable"
                checked={form.isAvailable}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span>Available</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isFeatured"
                checked={form.isFeatured}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span>Featured</span>
            </label>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="mt-6 flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
