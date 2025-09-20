'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Route to label mapping for admin pages
const routeLabels: Record<string, string> = {
  admin: 'Dashboard',
  products: 'Products',
  categories: 'Categories',
  orders: 'Orders',
  profiles: 'Face Profiles',
  employees: 'Employees',
  recommendations: 'Recommendations',
  new: 'New',
};

export function Breadcrumb() {
  const pathname = usePathname();

  // Split pathname and filter empty strings
  const segments = pathname.split('/').filter(Boolean);

  // Build breadcrumb items
  const items: BreadcrumbItem[] = [];
  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Check if this is a dynamic segment (UUID or ID)
    const isId = segment.match(/^[a-f0-9-]{36}$/i) || segment.match(/^[a-f0-9]{24}$/i);

    if (isId) {
      // For ID segments, show "Edit" or "Details"
      items.push({
        label: 'Edit',
        href: currentPath,
      });
    } else {
      const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

      // Last item doesn't get a link
      if (index === segments.length - 1) {
        items.push({ label });
      } else {
        items.push({
          label,
          href: currentPath,
        });
      }
    }
  });

  // Don't show breadcrumb on main admin dashboard
  if (items.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-sm mb-6">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && (
            <span
              className="material-symbols-outlined text-base"
              style={{ color: 'var(--color-on-surface-variant)' }}
            >
              chevron_right
            </span>
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="hover:underline transition-colors"
              style={{ color: 'var(--color-primary)' }}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: 'var(--color-on-surface-variant)' }}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
