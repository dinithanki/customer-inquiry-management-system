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
    return <div className="grid min-h-screen place-items-center bg-page p-8"><div className="flex min-h-[220px] flex-col items-center justify-center gap-2.5 text-center text-muted"><h3 className="mt-1 mb-0 text-[15px] text-text">Loading session</h3></div></div>;
  }

  if (!user) return null;
  if (user.must_change_password) return null;
  const role = user.role;

  return (
    <div className="min-h-screen">
      <Suspense fallback={null}>
        <Sidebar role={role} open={open} collapsed={collapsed} onClose={() => setOpen(false)} onToggleCollapsed={() => setCollapsed((value) => !value)} />
      </Suspense>
      <div className={`min-h-screen transition-[margin-left] duration-[180ms] ${collapsed ? "ml-[76px]" : "ml-[248px]"} max-[760px]:ml-0`}>
        <Suspense fallback={null}>
          <TopNavbar title="Dashboard" role={role} onMenuClick={() => setOpen(true)} />
        </Suspense>
        <main className="mx-auto w-full max-w-[1240px] px-8 py-8 max-[760px]:px-4 max-[760px]:py-6">{children}</main>
      </div>
    </div>
  );
}
