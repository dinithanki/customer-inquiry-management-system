import { Inbox } from "lucide-react";

export function EmptyState({ title = "No inquiries found", description = "There are no records to display." }: { title?: string; description?: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Inbox size={20} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
