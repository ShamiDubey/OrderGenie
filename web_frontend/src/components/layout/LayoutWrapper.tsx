'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { ChatWidget } from '@/components/chat';
import { useAuth } from '@/context/AuthContext';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Routes that should not show the navbar or chat widget
  const hideNavbar = pathname.startsWith('/employee') || pathname.startsWith('/admin') || pathname.startsWith('/kiosk');

  return (
    <>
      {!hideNavbar && <Navbar />}
      <main className={hideNavbar ? '' : 'pt-20'}>
        {children}
      </main>
      {/* Chat Widget - only show on customer-facing pages */}
      {!hideNavbar && <ChatWidget profileId={user?.id} userAvatarUrl={user?.avatarUrl} />}
    </>
  );
}
