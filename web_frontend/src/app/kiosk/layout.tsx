"use client";

import { KioskProvider } from "@/context/KioskContext";

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <KioskProvider>
      <div className="min-h-screen w-full bg-zinc-950 text-white overflow-hidden select-none">
        {children}
      </div>
    </KioskProvider>
  );
}
