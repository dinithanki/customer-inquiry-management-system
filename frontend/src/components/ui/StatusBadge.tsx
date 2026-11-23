export type InquiryStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";

const labels: Record<InquiryStatus, string> = { NEW: "New", IN_PROGRESS: "In Progress", RESOLVED: "Resolved" };
const statusStyles: Record<InquiryStatus, string> = {
  NEW: "bg-blue-50 text-primary",
  IN_PROGRESS: "bg-amber-50 text-warning",
  RESOLVED: "bg-green-50 text-success",
};

export function StatusBadge({ status }: { status: InquiryStatus }) {
  return (
    <span className={`inline-flex min-h-[26px] items-center gap-[7px] whitespace-nowrap rounded-full px-[9px] text-[11px] font-bold before:size-[7px] before:rounded-full before:bg-current before:content-[''] ${statusStyles[status]}`}>
      {labels[status]}
    </span>
  );
}
