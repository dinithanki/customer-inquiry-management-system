export type InquiryStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";

const labels: Record<InquiryStatus, string> = { NEW: "New", IN_PROGRESS: "In Progress", RESOLVED: "Resolved" };

export function StatusBadge({ status }: { status: InquiryStatus }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{labels[status]}</span>;
}
