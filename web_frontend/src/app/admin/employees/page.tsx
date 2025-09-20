'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getEmployees, deleteEmployee } from '@/lib/employee-api';
import { Employee } from '@/types';

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, [includeInactive]);

  const loadEmployees = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getEmployees(includeInactive);
      if (result.success && result.data) {
        setEmployees(result.data);
      } else {
        setError(result.error || 'Failed to load employees');
      }
    } catch (err) {
      console.error('Error loading employees:', err);
      setError('Failed to load employees');
    }

    setIsLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate ${name}?`)) {
      return;
    }

    try {
      const result = await deleteEmployee(id);
      if (result.success) {
        loadEmployees();
      } else {
        alert(result.error || 'Failed to deactivate employee');
      }
    } catch (err) {
      console.error('Error deleting employee:', err);
      alert('Failed to deactivate employee');
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface-container)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-6 py-4 shadow-sm" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
              style={{ backgroundColor: 'var(--color-surface-container)' }}
            >
              <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface)' }}>arrow_back</span>
            </Link>
            <div>
              <h1 className="text-xl font-semibold" style={{ color: 'var(--color-on-surface)' }}>Employee Management</h1>
              <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>Manage employee accounts</p>
            </div>
          </div>
          <Link
            href="/admin/employees/new"
            className="px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add Employee
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Filters */}
        <div className="mb-6 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>Show inactive employees</span>
          </label>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--color-error-container)', color: 'var(--color-on-error-container)' }}>
            {error}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && employees.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-container)' }}>
              <span className="material-symbols-outlined text-3xl" style={{ color: 'var(--color-on-surface-variant)' }}>badge</span>
            </div>
            <p className="text-lg font-medium mb-2" style={{ color: 'var(--color-on-surface)' }}>No employees yet</p>
            <p className="mb-4" style={{ color: 'var(--color-on-surface-variant)' }}>Add your first employee to get started</p>
            <Link
              href="/admin/employees/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Employee
            </Link>
          </div>
        )}

        {/* Employees Grid */}
        {!isLoading && !error && employees.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className={`rounded-2xl p-4 shadow-sm transition-all ${!employee.isActive ? 'opacity-60' : ''}`}
                style={{ backgroundColor: 'var(--color-surface)' }}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--color-primary-container)' }}>
                    {employee.profileImageUrl ? (
                      <Image
                        src={employee.profileImageUrl}
                        alt={employee.name}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--color-on-primary-container)' }}>person</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate" style={{ color: 'var(--color-on-surface)' }}>{employee.name}</h3>
                      {!employee.isActive && (
                        <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--color-error-container)', color: 'var(--color-on-error-container)' }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--color-primary)' }}>{employee.employeeId}</p>
                    {employee.gender && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>
                        {employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1)}
                        {employee.dateOfBirth && ` • ${new Date(employee.dateOfBirth).toLocaleDateString()}`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-outline-variant)' }}>
                  <div className="text-sm">
                    <span style={{ color: 'var(--color-on-surface-variant)' }}>Orders: </span>
                    <span className="font-medium" style={{ color: 'var(--color-on-surface)' }}>{employee._count?.orders || 0}</span>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
                    {employee.lastLoginAt ? (
                      <>Last login: {new Date(employee.lastLoginAt).toLocaleDateString()}</>
                    ) : (
                      'Never logged in'
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/admin/employees/${employee.id}`}
                    className="flex-1 py-2 rounded-xl text-center text-sm font-medium transition-all hover:opacity-80"
                    style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface)' }}
                  >
                    Edit
                  </Link>
                  {employee.isActive && (
                    <button
                      onClick={() => handleDelete(employee.id, employee.name)}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                      style={{ backgroundColor: 'var(--color-error-container)', color: 'var(--color-on-error-container)' }}
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
