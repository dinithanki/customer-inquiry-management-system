"use client";

import { Menu, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

type TopNavbarProps = {
  title: string;
  role?: "ADMIN" | "STAFF";
  onMenuClick: () => void;
};

export function TopNavbar({ title, role = "ADMIN", onMenuClick }: TopNavbarProps) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const derivedTitle = pathname.startsWith("/inquiries") ? "Inquiries" : pathname.startsWith("/staff") ? "Staff Management" : "Dashboard";
  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border bg-white/95 px-8 backdrop-blur-[10px] max-[760px]:h-[60px] max-[760px]:px-4">
      <div className="flex items-center gap-3">
        <button className="hidden size-[38px] place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-primary max-[760px]:inline-grid" type="button" onClick={onMenuClick} aria-label="Open navigation"><Menu size={20} /></button>
        <span className="text-base font-bold text-text">{derivedTitle || title}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="grid gap-0.5 text-right max-[760px]:hidden"><strong className="text-xs">{user?.name ?? user?.email ?? "User"}</strong><span className="text-[10px] capitalize text-muted">{role}</span></span>
        <span className="grid size-9 place-items-center rounded-full bg-blue-100 text-blue-700" aria-hidden="true"><UserRound size={17} /></span>
      </div>
    </header>
  );
}
