'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCartStore } from '@/stores';
import { formatPoints } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Menu' },
  { href: '/categories', label: 'Categories' },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const { getItemCount, isHydrated } = useCartStore();

  const itemCount = isHydrated ? getItemCount() : 0;

  // Hide navbar on employee mode and admin routes
  if (pathname.startsWith('/employee') || pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-border-light)] bg-[var(--color-bg)]/95 backdrop-blur-md transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex h-20 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="relative flex items-center justify-center size-10 rounded-full bg-[var(--color-primary-10)] text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors duration-300">
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: '24px' }}>
                coffee
              </span>
            </div>
            <span className="text-xl font-bold tracking-tight text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
              Barista
            </span>
          </Link>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center gap-8 lg:gap-12 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors relative ${
                    isActive
                      ? 'text-[var(--color-text)] after:content-[\'\'] after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-0.5 after:bg-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Admin Link */}
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors opacity-70 hover:opacity-100 ${
                pathname.startsWith('/admin')
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lock</span>
              Admin
            </Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Authenticated User Section */}
            {isAuthenticated && user ? (
              <>
                {/* Loyalty Points Pill */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gold-bg)] border border-[var(--color-gold)]/20 rounded-full">
                  <span className="material-symbols-outlined icon-filled text-[var(--color-gold)]" style={{ fontSize: '18px' }}>
                    star
                  </span>
                  <span className="text-xs font-bold text-[var(--color-gold-text)] whitespace-nowrap">
                    {formatPoints(user.totalPoints || 0)} pts
                  </span>
                </div>

                {/* Cart Icon */}
                <Link
                  href="/cart"
                  className="relative p-2 text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] rounded-full transition-colors group"
                >
                  <span className="material-symbols-outlined group-hover:text-[var(--color-primary)] transition-colors">
                    shopping_bag
                  </span>
                  {itemCount > 0 && (
                    <span className="absolute top-1.5 right-1 size-4 bg-[var(--color-primary)] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[var(--color-bg)]">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </Link>

                {/* Divider */}
                <div className="h-6 w-px bg-[var(--color-border)] hidden sm:block" />

                {/* User Profile */}
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <button
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--color-bg-tertiary)] rounded-lg cursor-pointer transition-colors"
                    >
                      {user.avatarUrl ? (
                        <div className="size-8 rounded-full overflow-hidden">
                          <Image
                            src={user.avatarUrl}
                            alt={user.name}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="size-8 rounded-full bg-[var(--color-primary-10)] flex items-center justify-center">
                          <span className="text-[var(--color-primary)] font-semibold text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-semibold text-[var(--color-text)] hidden lg:block max-w-[100px] truncate">
                        {user.name}
                      </span>
                      <span className="material-symbols-outlined text-[var(--color-text-muted)] hidden sm:block" style={{ fontSize: '18px' }}>
                        expand_more
                      </span>
                    </button>

                    {/* Dropdown Menu */}
                    <div className="absolute right-0 top-full mt-1 w-48 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</span>
                        Edit Profile
                      </Link>
                      <Link
                        href="/orders"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>receipt_long</span>
                        My Orders
                      </Link>
                      <div className="border-t border-[var(--color-border)] my-1" />
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-error)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Cart Icon (Logged Out) */}
                <Link
                  href="/cart"
                  className="relative p-2 text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] rounded-full transition-colors group"
                >
                  <span className="material-symbols-outlined group-hover:text-[var(--color-primary)] transition-colors">
                    shopping_cart
                  </span>
                  {itemCount > 0 ? (
                    <span className="absolute top-1.5 right-1 size-4 bg-[var(--color-primary)] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[var(--color-bg)]">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  ) : (
                    <span className="absolute -top-1 -right-1 text-[var(--color-text-muted)] text-[10px] font-bold">
                      (0)
                    </span>
                  )}
                </Link>

                {/* Face Login Button */}
                <Link
                  href="/login"
                  className="flex items-center gap-2 h-10 px-5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-semibold rounded-lg shadow-md transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>face</span>
                  <span className="hidden sm:inline">Face Login</span>
                </Link>
              </>
            )}

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 text-[var(--color-text)]">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
