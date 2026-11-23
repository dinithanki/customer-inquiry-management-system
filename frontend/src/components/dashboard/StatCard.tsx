import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
};

export function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <article className="stat-card">
      <div className="stat-card-top"><span>{label}</span><span className="stat-icon"><Icon size={18} aria-hidden="true" /></span></div>
      <strong className="stat-value">{value}</strong>
      <span className="stat-hint">{hint}</span>
    </article>
  );
}
