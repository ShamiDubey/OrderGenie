'use client';

import { EmployeeProvider } from '@/context/EmployeeContext';

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EmployeeProvider>
      {children}
    </EmployeeProvider>
  );
}
