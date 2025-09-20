'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getEmployee, updateEmployee } from '@/lib/employee-api';
import { Employee } from '@/types';

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changePin, setChangePin] = useState(false);

  useEffect(() => {
    loadEmployee();
  }, [employeeId]);

  const loadEmployee = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getEmployee(employeeId);
      if (result.success && result.data) {
        const emp = result.data;
        setEmployee(emp);
        setFormData({
          employeeId: emp.employeeId,
          name: emp.name,
          pin: '',
          confirmPin: '',
          dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.split('T')[0] : '',
          gender: emp.gender || '',
        });
        if (emp.profileImageUrl) {
          setImagePreview(emp.profileImageUrl);
        }
      } else {
        setError(result.error || 'Failed to load employee');
      }
    } catch (err) {
      console.error('Error loading employee:', err);
      setError('Failed to load employee');
    }

    setIsLoading(false);
  };

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

    // PIN validation only if changing PIN
    if (changePin) {
      if (!formData.pin || formData.pin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }

      if (formData.pin !== formData.confirmPin) {
        setError('PINs do not match');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const updateData: {
        employeeId: string;
        name: string;
        pin?: string;
        dateOfBirth?: string;
        gender?: string;
        image?: File;
      } = {
        employeeId: formData.employeeId.trim(),
        name: formData.name.trim(),
      };

      if (changePin && formData.pin) {
        updateData.pin = formData.pin;
      }

      if (formData.dateOfBirth) {
        updateData.dateOfBirth = formData.dateOfBirth;
      }

      if (formData.gender) {
        updateData.gender = formData.gender;
      }

      if (image) {
        updateData.image = image;
      }

      const result = await updateEmployee(employeeId, updateData);

      if (result.success) {
        router.push('/admin/employees');
      } else {
        setError(result.error || 'Failed to update employee');
      }
    } catch (err) {
      console.error('Error updating employee:', err);
      setError('Failed to update employee');
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-container)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-container)' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'var(--color-error-container)' }}>
            <span className="material-symbols-outlined text-3xl" style={{ color: 'var(--color-on-error-container)' }}>error</span>
          </div>
          <p className="text-lg font-medium mb-2" style={{ color: 'var(--color-on-surface)' }}>Employee not found</p>
          <Link
            href="/admin/employees"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mt-4"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Employees
          </Link>
        </div>
      </div>
    );
  }

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
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-on-surface)' }}>Edit Employee</h1>
            <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>{employee.name}</p>
          </div>
          {!employee.isActive && (
            <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: 'var(--color-error-container)', color: 'var(--color-on-error-container)' }}>
              Inactive
            </span>
          )}
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

          {/* Change PIN Section */}
          <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-surface-container)' }}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={changePin}
                onChange={(e) => {
                  setChangePin(e.target.checked);
                  if (!e.target.checked) {
                    setFormData({ ...formData, pin: '', confirmPin: '' });
                  }
                }}
                className="w-5 h-5 rounded"
              />
              <span className="font-medium" style={{ color: 'var(--color-on-surface)' }}>Change PIN</span>
            </label>

            {changePin && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* New PIN */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-on-surface)' }}>
                    New PIN *
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

                {/* Confirm New PIN */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-on-surface)' }}>
                    Confirm New PIN *
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
              </div>
            )}
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
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">save</span>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
