import { Inbox } from "lucide-react";

export function EmptyState({ title = "No inquiries found", description = "There are no records to display." }: { title?: string; description?: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-2.5 text-center text-muted">
      <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-primary"><Inbox size={20} /></span>
      <h3 className="mt-1 mb-0 text-[15px] font-bold text-text">{title}</h3>
      <p className="m-0 max-w-[420px] text-xs leading-[1.6]">{description}</p>
    </div>
  );
}
