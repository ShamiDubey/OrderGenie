'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createEmployee } from '@/lib/employee-api';

export default function NewEmployeePage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    pin: '',
    confirmPin: '',
    dateOfBirth: '',
    gender: '',
  });
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.employeeId.trim()) {
      setError('Employee ID is required');
      return;
    }

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.pin || formData.pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    if (formData.pin !== formData.confirmPin) {
      setError('PINs do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createEmployee({
        employeeId: formData.employeeId.trim(),
        name: formData.name.trim(),
        pin: formData.pin,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        image: image || undefined,
      });

      if (result.success) {
        router.push('/admin/employees');
      } else {
        setError(result.error || 'Failed to create employee');
      }
    } catch (err) {
      console.error('Error creating employee:', err);
      setError('Failed to create employee');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface-container)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-6 py-4 shadow-sm" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            href="/admin/employees"
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
            style={{ backgroundColor: 'var(--color-surface-container)' }}
          >
            <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface)' }}>arrow_back</span>
          </Link>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-on-surface)' }}>Add New Employee</h1>
            <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>Create a new employee account</p>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="rounded-3xl p-6 shadow-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
          {/* Profile Image */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-container)' }}>
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-5xl" style={{ color: 'var(--color-on-surface-variant)' }}>person</span>
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:opacity-80" style={{ backgroundColor: 'var(--color-primary)' }}>
                <span className="material-symbols-outlined text-sm" style={{ color: 'var(--color-on-primary)' }}>photo_camera</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee ID */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-on-surface)' }}>
                Employee ID *
              </label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="e.g., EMP001"
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: 'var(--color-surface-container-low)',
                  borderColor: 'var(--color-outline-variant)',
                  color: 'var(--color-on-surface)',
                }}
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-on-surface)' }}>
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: 'var(--color-surface-container-low)',
                  borderColor: 'var(--color-outline-variant)',
                  color: 'var(--color-on-surface)',
                }}
              />
            </div>

            {/* PIN */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-on-surface)' }}>
                PIN *
              </label>
              <input
                type="password"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                placeholder="4-6 digit PIN"
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: 'var(--color-surface-container-low)',
                  borderColor: 'var(--color-outline-variant)',
                  color: 'var(--color-on-surface)',
                }}
              />
            </div>

            {/* Confirm PIN */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-on-surface)' }}>
                Confirm PIN *
              </label>
              <input
                type="password"
                value={formData.confirmPin}
                onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value.replace(/\D/g, '') })}
                placeholder="Re-enter PIN"
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: 'var(--color-surface-container-low)',
                  borderColor: 'var(--color-outline-variant)',
                  color: 'var(--color-on-surface)',
                }}
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-on-surface)' }}>
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: 'var(--color-surface-container-low)',
                  borderColor: 'var(--color-outline-variant)',
                  color: 'var(--color-on-surface)',
                }}
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-on-surface)' }}>
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: 'var(--color-surface-container-low)',
                  borderColor: 'var(--color-outline-variant)',
                  color: 'var(--color-on-surface)',
                }}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--color-error-container)', color: 'var(--color-on-error-container)' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="mt-8 flex gap-4">
            <Link
              href="/admin/employees"
              className="flex-1 py-3 rounded-xl text-center font-medium transition-all hover:opacity-80"
              style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface)' }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">add</span>
                  Create Employee
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
