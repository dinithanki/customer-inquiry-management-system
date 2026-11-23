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
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-icon-button mobile-menu" type="button" onClick={onMenuClick} aria-label="Open navigation"><Menu size={20} /></button>
        <span className="page-title">{derivedTitle || title}</span>
      </div>
      <div className="topbar-user">
        <span className="topbar-account"><strong>{user?.name ?? user?.email ?? "User"}</strong><span>{role}</span></span>
        <span className="avatar" aria-hidden="true"><UserRound size={17} /></span>
      </div>
    </header>
  );
}
