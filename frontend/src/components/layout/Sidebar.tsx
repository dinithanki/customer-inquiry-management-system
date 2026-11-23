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
      {open && <button className="fixed inset-0 z-[29] hidden border-0 bg-slate-900/40 max-[760px]:block" aria-label="Close navigation" onClick={onClose} />}
      <aside
        className="group fixed inset-y-0 left-0 z-[30] flex w-[248px] flex-col border-r border-white/[0.08] bg-sidebar px-[14px] pt-[22px] pb-4 text-white transition-[width,transform] duration-[180ms] data-[collapsed=true]:w-[76px] max-[760px]:w-[min(280px,calc(100vw-48px))] max-[760px]:-translate-x-[102%] max-[760px]:data-[open=true]:translate-x-0"
        data-collapsed={collapsed}
        data-open={open}
        aria-label="Primary navigation"
      >
        <Link className="flex h-11 items-center gap-[11px] px-2 text-white no-underline group-data-[collapsed=true]:justify-center group-data-[collapsed=true]:px-0" href="/dashboard" onClick={onClose}>
          <span className="grid size-9 shrink-0 place-items-center rounded-[11px] border border-white/[0.14] bg-primary text-white"><Inbox size={19} /></span>
          <span className="whitespace-nowrap text-base font-bold tracking-[-0.02em] group-data-[collapsed=true]:hidden max-[760px]:group-data-[collapsed=true]:block">Inquiry Desk</span>
        </Link>
        <div className="mx-[11px] mt-[34px] mb-[11px] text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 group-data-[collapsed=true]:hidden max-[760px]:group-data-[collapsed=true]:block">Workspace</div>
        <nav className="grid gap-[5px] group-data-[collapsed=true]:mt-6 max-[760px]:group-data-[collapsed=true]:mt-0">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                className={`relative flex min-h-[46px] items-center gap-3 rounded-[9px] px-[13px] text-[13px] font-medium text-slate-300 no-underline transition-[background,color] duration-150 hover:bg-white/[0.08] hover:text-white group-data-[collapsed=true]:justify-center group-data-[collapsed=true]:px-0 max-[760px]:group-data-[collapsed=true]:justify-start max-[760px]:group-data-[collapsed=true]:px-3 ${active ? "bg-primary text-white shadow-[0_5px_14px_rgba(37,99,235,0.2)] before:absolute before:top-3 before:bottom-3 before:left-0 before:w-[3px] before:rounded-r-[3px] before:bg-blue-200 before:content-['']" : ""}`}
                href={item.href}
                key={item.href}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                onClick={onClose}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="group-data-[collapsed=true]:hidden max-[760px]:group-data-[collapsed=true]:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto grid gap-2.5">
          <div className="flex min-h-[62px] items-center gap-2.5 border-t border-white/[0.12] px-2 pt-3.5">
            <span className="grid min-w-0 gap-[3px] group-data-[collapsed=true]:hidden max-[760px]:group-data-[collapsed=true]:grid">
              <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs">{user?.name ?? user?.email ?? "User"}</strong>
              <span className="w-fit rounded-full bg-white/[0.09] px-[7px] py-0.5 text-[9px] font-semibold capitalize text-slate-400">{role.toLowerCase()}</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 px-[6px] group-data-[collapsed=true]:absolute group-data-[collapsed=true]:right-[19px] group-data-[collapsed=true]:bottom-[14px] group-data-[collapsed=true]:left-[19px] group-data-[collapsed=true]:justify-center group-data-[collapsed=true]:px-0 max-[760px]:group-data-[collapsed=true]:static max-[760px]:group-data-[collapsed=true]:justify-between max-[760px]:group-data-[collapsed=true]:px-[6px]">
            <button className="inline-flex h-[38px] min-w-0 items-center gap-[9px] rounded-lg border-0 bg-transparent px-2.5 text-xs text-slate-300 transition-[background,color] duration-150 hover:bg-white/[0.08] hover:text-white group-data-[collapsed=true]:first:hidden max-[760px]:group-data-[collapsed=true]:first:inline-flex" type="button" title="Logout" aria-label="Logout" onClick={() => void handleLogout()}><LogOut size={17} /><span className="group-data-[collapsed=true]:hidden max-[760px]:group-data-[collapsed=true]:inline">Log out</span></button>
            <button className="inline-grid size-[38px] shrink-0 place-items-center rounded-lg border-0 bg-transparent text-inherit hover:bg-white/[0.08] group-data-[collapsed=true]:flex-[0_0_38px] group-data-[collapsed=true]:bg-white/[0.12] group-data-[collapsed=true]:text-white group-data-[collapsed=true]:hover:bg-white/20" type="button" title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={onToggleCollapsed}>
              {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
