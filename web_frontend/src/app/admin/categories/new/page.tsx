'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createCategory } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CategoryModifier, ModifierOption } from '@/types';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export default function NewCategoryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    displayOrder: '0',
    isActive: true,
    image: null as File | null,
  });

  const [modifiers, setModifiers] = useState<CategoryModifier[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
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

  // Modifier management functions
  const addModifierGroup = () => {
    setModifiers((prev) => [
      ...prev,
      {
        name: '',
        required: false,
        multiSelect: true,
        options: [{ name: '', price: 0 }],
      },
    ]);
  };

  const removeModifierGroup = (index: number) => {
    setModifiers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateModifierGroup = (index: number, field: keyof CategoryModifier, value: string | boolean) => {
    setModifiers((prev) =>
      prev.map((mod, i) => (i === index ? { ...mod, [field]: value } : mod))
    );
  };

  const addModifierOption = (groupIndex: number) => {
    setModifiers((prev) =>
      prev.map((mod, i) =>
        i === groupIndex
          ? { ...mod, options: [...mod.options, { name: '', price: 0 }] }
          : mod
      )
    );
  };

  const removeModifierOption = (groupIndex: number, optionIndex: number) => {
    setModifiers((prev) =>
      prev.map((mod, i) =>
        i === groupIndex
          ? { ...mod, options: mod.options.filter((_, oi) => oi !== optionIndex) }
          : mod
      )
    );
  };

  const updateModifierOption = (
    groupIndex: number,
    optionIndex: number,
    field: keyof ModifierOption,
    value: string | number
  ) => {
    setModifiers((prev) =>
      prev.map((mod, i) =>
        i === groupIndex
          ? {
              ...mod,
              options: mod.options.map((opt, oi) =>
                oi === optionIndex ? { ...opt, [field]: value } : opt
              ),
            }
          : mod
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Filter out empty modifier groups and options
    const cleanedModifiers = modifiers
      .filter((mod) => mod.name.trim() !== '')
      .map((mod) => ({
        ...mod,
        options: mod.options.filter((opt) => opt.name.trim() !== ''),
      }))
      .filter((mod) => mod.options.length > 0);

    const result = await createCategory({
      name: form.name,
      description: form.description || undefined,
      displayOrder: parseInt(form.displayOrder, 10),
      isActive: form.isActive,
      modifiers: cleanedModifiers.length > 0 ? cleanedModifiers : undefined,
      image: form.image || undefined,
    });

    if (result.success) {
      router.push('/admin/categories');
    } else {
      setError(result.error || 'Failed to create category');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Add New Category</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h2>
          <div className="space-y-4">
            {/* Name */}
            <div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Display Order & Active */}
            <div className="grid grid-cols-2 gap-4">
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
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>

            {/* Image */}
            <div>
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
                    <p className="text-sm">Click to upload image</p>
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
          </div>
        </div>

        {/* Menu Modifiers Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Menu Modifiers</h2>
            <button
              type="button"
              onClick={addModifierGroup}
              className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Modifier Group
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Define customization options for products in this category (e.g., Sugar Level, Toppings, Add-ons).
          </p>

          {modifiers.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-gray-400">No modifiers defined yet</p>
              <button
                type="button"
                onClick={addModifierGroup}
                className="mt-2 text-blue-600 hover:underline text-sm"
              >
                Add your first modifier group
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {modifiers.map((modifier, groupIndex) => (
                <div
                  key={groupIndex}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-start gap-2 mb-3">
                    <GripVertical className="w-5 h-5 text-gray-400 mt-2 cursor-grab" />
                    <div className="flex-1 space-y-3">
                      {/* Group Name */}
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={modifier.name}
                          onChange={(e) => updateModifierGroup(groupIndex, 'name', e.target.value)}
                          placeholder="Modifier Group Name (e.g., Sugar Level)"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeModifierGroup(groupIndex)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete modifier group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Group Settings */}
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={modifier.multiSelect}
                            onChange={(e) => updateModifierGroup(groupIndex, 'multiSelect', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600">Multi-select</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={modifier.required}
                            onChange={(e) => updateModifierGroup(groupIndex, 'required', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600">Required</span>
                        </label>
                      </div>

                      {/* Options */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Options</span>
                          <button
                            type="button"
                            onClick={() => addModifierOption(groupIndex)}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add Option
                          </button>
                        </div>

                        {modifier.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={option.name}
                              onChange={(e) =>
                                updateModifierOption(groupIndex, optionIndex, 'name', e.target.value)
                              }
                              placeholder="Option name"
                              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {modifier.options.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeModifierOption(groupIndex, optionIndex)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove option"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                Creating...
              </>
            ) : (
              'Create Category'
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
