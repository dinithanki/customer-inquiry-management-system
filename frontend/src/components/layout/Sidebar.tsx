"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Inbox, LayoutDashboard, LogOut, Users } from "lucide-react";
import { logout } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";

type SidebarProps = {
  role?: "ADMIN" | "STAFF";
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapsed: () => void;
};

export function Sidebar({ role = "ADMIN", open, collapsed, onClose, onToggleCollapsed }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuth();
      router.replace("/login");
    }
  };
  const items = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inquiries", label: "Inquiries", icon: Inbox },
    ...(role === "ADMIN" ? [{ href: "/staff", label: "Staff Management", icon: Users }] : []),
  ];

  return (
    <>
      {open && <button className="nav-scrim" aria-label="Close navigation" onClick={onClose} />}
      <aside className={`sidebar${collapsed ? " collapsed" : ""}${open ? " open" : ""}`} aria-label="Primary navigation">
        <Link className="brand" href="/dashboard" onClick={onClose}>
          <span className="brand-mark"><Inbox size={19} /></span>
          <span className="brand-name">Inquiry Desk</span>
        </Link>
        <nav className="sidebar-nav">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link className={`nav-item${active ? " active" : ""}`} href={item.href} key={item.href} title={collapsed ? item.label : undefined} onClick={onClose}>
                <Icon size={18} aria-hidden="true" />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-profile">
            <span className="avatar">AU</span>
            <span className="profile-copy"><strong>{user?.name ?? user?.email ?? "User"}</strong><span>{role.toLowerCase()}</span></span>
          </div>
          <div className="sidebar-actions">
            <button className="sidebar-icon-button" type="button" title="Logout" aria-label="Logout" onClick={handleLogout}><LogOut size={17} /></button>
            <button className="sidebar-icon-button" type="button" title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={onToggleCollapsed}>
              {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
