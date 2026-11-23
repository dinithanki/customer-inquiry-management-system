"use client";

import { Suspense, useState, type ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { useAuthStore } from "@/store/auth.store";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const { user, isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.must_change_password) {
      router.replace("/change-password");
    }
  }, [isInitialized, router, user]);

  if (!isInitialized) {
    return <div className="login-screen"><div className="empty-state"><h3>Loading session</h3></div></div>;
  }

  if (!user) return null;
  if (user.must_change_password) return null;
  const role = user.role;

  return (
    <div className="dashboard-shell">
      <Suspense fallback={null}>
        <Sidebar role={role} open={open} collapsed={collapsed} onClose={() => setOpen(false)} onToggleCollapsed={() => setCollapsed((value) => !value)} />
      </Suspense>
      <div className={`main-panel${collapsed ? " sidebar-collapsed" : ""}`}>
        <Suspense fallback={null}>
          <TopNavbar title="Dashboard" role={role} onMenuClick={() => setOpen(true)} />
        </Suspense>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
