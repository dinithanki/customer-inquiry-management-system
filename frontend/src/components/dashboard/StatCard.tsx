import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: number | string;
  hint: string;
  icon: LucideIcon;
  tone?: "blue" | "amber" | "green";
};

const toneStyles = {
  blue: { bar: "before:bg-primary", icon: "bg-blue-50 text-primary" },
  amber: { bar: "before:bg-warning", icon: "bg-amber-50 text-warning" },
  green: { bar: "before:bg-success", icon: "bg-green-50 text-success" },
} as const;

export function StatCard({ label, value, hint, icon: Icon, tone = "blue" }: StatCardProps) {
  return (
    <article className={`relative min-h-[132px] overflow-hidden rounded-[14px] border border-border bg-card p-[19px_20px] shadow-card transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)] before:absolute before:inset-x-0 before:top-0 before:h-[3px] max-[420px]:min-h-[118px] max-[420px]:p-[14px] ${toneStyles[tone].bar}`}>
      <div className="flex items-center justify-between text-[13px] font-semibold text-muted">
        <span>{label}</span>
        <span className={`grid size-[38px] place-items-center rounded-[9px] ${toneStyles[tone].icon}`}><Icon size={18} aria-hidden="true" /></span>
      </div>
      <strong className="mt-3 block text-[30px] leading-none tracking-[-1px] text-slate-800 max-[420px]:text-[26px]">{value}</strong>
      <span className="mt-2 block text-[11px] text-muted">{hint}</span>
    </article>
  );
}
