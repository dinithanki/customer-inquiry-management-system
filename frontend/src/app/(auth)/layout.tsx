import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_8%_12%,rgba(37,99,235,0.1),transparent_26%),radial-gradient(circle_at_92%_88%,rgba(30,64,175,0.08),transparent_30%),#f1f5f9] p-8 max-[760px]:p-5 max-[420px]:p-3">
      {children}
    </div>
  );
}
