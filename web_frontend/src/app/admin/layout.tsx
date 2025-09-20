'use client';

import { ReactNode } from 'react';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { Breadcrumb } from '@/components/admin/Breadcrumb';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Breadcrumb />
        {children}
      </div>
    </AdminGuard>
  );
}
