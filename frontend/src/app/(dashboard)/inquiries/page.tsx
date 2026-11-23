"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, CirclePlus, Eye, Inbox, LoaderCircle, RotateCcw, Search, Trash2 } from "lucide-react";
import { getApiErrorMessage } from "@/lib/api";
import { deleteInquiry, listInquiries, getInquiry, updateInquiryStatus } from "@/services/inquiry.service";
import type { InquiryListItem, InquiryStatus } from "@/types/inquiry";
import { useAuthStore } from "@/store/auth.store";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

const emptyPagination = { page: 1, limit: 10, total: 0, totalPages: 0 };
const inquiryRowStyles: Record<InquiryStatus, string> = {
  NEW: "bg-blue-50/60 hover:bg-blue-50",
  IN_PROGRESS: "bg-amber-50/60 hover:bg-amber-50",
  RESOLVED: "bg-green-50/60 hover:bg-green-50",
};

export default function InquiriesPage() {
  const role = useAuthStore((state) => state.user?.role);
  const [inquiries, setInquiries] = useState<InquiryListItem[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [counts, setCounts] = useState<Record<InquiryStatus | "TOTAL", number>>({ TOTAL: 0, NEW: 0, IN_PROGRESS: 0, RESOLVED: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InquiryStatus | "">("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, all, newData, progress, resolved] = await Promise.all([
        listInquiries({ page, limit: 10, search: search || undefined, status: status || undefined }),
        listInquiries({ page: 1, limit: 1 }),
        listInquiries({ page: 1, limit: 1, status: "NEW" }),
        listInquiries({ page: 1, limit: 1, status: "IN_PROGRESS" }),
        listInquiries({ page: 1, limit: 1, status: "RESOLVED" }),
      ]);
      setInquiries(list.data);
      setPagination(list.pagination);
      setCounts({ TOTAL: all.pagination.total, NEW: newData.pagination.total, IN_PROGRESS: progress.pagination.total, RESOLVED: resolved.pagination.total });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const advance = async (inquiry: InquiryListItem) => {
    const next = inquiry.status === "NEW" ? "IN_PROGRESS" : inquiry.status === "IN_PROGRESS" ? "RESOLVED" : "IN_PROGRESS";
    try {
      const current = await getInquiry(inquiry.id);
      await updateInquiryStatus(inquiry.id, next, current.version);
      await load();
    } catch (updateError) {
      setError(getApiErrorMessage(updateError));
    }
  };

  const remove = async (inquiry: InquiryListItem) => {
    if (!window.confirm(`Delete inquiry ${inquiry.id.slice(0, 8)}?`)) return;
    try {
      await deleteInquiry(inquiry.id);
      await load();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    }
  };

  return (
    <>
      <PageHeader title="Inquiries" description="Manage and track customer requests." action={
        <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-[14px] text-[13px] font-semibold text-white no-underline shadow-[0_4px_12px_rgba(37,99,235,0.16)] hover:bg-blue-700 max-[420px]:[&_span]:hidden" href="/inquiries/new"><CirclePlus size={17} /><span>New Inquiry</span></Link>
      } />
      {error && <div className="mx-5 my-4 rounded-lg border border-red-200 bg-red-50 px-3 py-[11px] text-xs leading-[1.5] text-red-700">{error}</div>}
      <section className="mb-6 grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[420px]:gap-3 max-[420px]:grid-cols-2" aria-label="Inquiry summary">
        <StatCard label="Total Inquiries" value={counts.TOTAL} hint="Across all active inquiries" icon={Inbox} />
        <StatCard label="New" value={counts.NEW} hint="Waiting for review" icon={CirclePlus} />
        <StatCard label="In Progress" value={counts.IN_PROGRESS} hint="Currently being handled" icon={LoaderCircle} />
        <StatCard label="Resolved" value={counts.RESOLVED} hint="Completed inquiries" icon={CheckCircle2} />
      </section>
      <section className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex min-h-16 items-center gap-2.5 border-b border-border px-5 py-3 max-[760px]:items-stretch">
          <form className="flex h-10 w-[min(360px,100%)] items-center gap-2 rounded-lg border border-border px-2.5 text-muted max-[760px]:w-auto max-[760px]:flex-1" onSubmit={(event) => { event.preventDefault(); setPage(1); void load(); }}>
            <Search size={16} className="shrink-0" />
            <input className="w-full border-0 bg-transparent text-[13px] text-text outline-none placeholder:text-slate-400" aria-label="Search inquiries" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by customer or subject" />
          </form>
          <select className="h-10 rounded-lg border border-border bg-white px-2.5 text-[13px] text-text" aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value as InquiryStatus | ""); setPage(1); }}>
            <option value="">All statuses</option><option value="NEW">New</option><option value="IN_PROGRESS">In Progress</option><option value="RESOLVED">Resolved</option>
          </select>
        </div>
        {loading ? <div className="flex min-h-[220px] items-center justify-center text-muted">Loading inquiries...</div> : inquiries.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2.5 text-center text-muted"><span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-primary"><Inbox size={20} /></span><h3 className="mt-1 mb-0 text-[15px] font-bold text-text">No inquiries found</h3><p className="m-0 max-w-[420px] text-xs leading-[1.6]">Try changing your search or filters.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] table-fixed border-collapse text-xs [&_td]:h-[62px] [&_td]:border-b [&_td]:border-slate-100 [&_td]:px-3.5 [&_td]:py-2 [&_td]:text-text [&_th]:h-11 [&_th]:border-b [&_th]:border-border [&_th]:bg-white [&_th]:px-3.5 [&_th]:text-left [&_th]:text-[10px] [&_th]:font-semibold [&_th]:tracking-[0.045em] [&_th]:text-slate-500 [&_th]:uppercase [&_th]:whitespace-nowrap [&_td:last-child]:pr-3 [&_th:last-child]:pr-3 [&_td:not(:last-child)]:overflow-hidden [&_td:not(:last-child)]:text-ellipsis">
              <colgroup><col className="w-[9%]" /><col className="w-[20%]" /><col className="w-[22%]" /><col className="w-[13%]" /><col className="w-[17%]" /><col className="w-[19%]" /></colgroup>
              <thead><tr><th>Inquiry ID</th><th>Customer Name</th><th>Contact</th><th>Status</th><th>Created</th><th className="text-center">Actions</th></tr></thead>
              <tbody>{inquiries.map((inquiry) => (
                <tr className={`transition-colors duration-[140ms] ${inquiryRowStyles[inquiry.status]}`} key={inquiry.id}>
                  <td><code className="text-[11px] text-muted">{inquiry.id.slice(0, 8)}</code></td>
                  <td><strong className="text-slate-800">{inquiry.customer_name}</strong></td>
                  <td><span className="mb-1 block overflow-hidden text-ellipsis text-[10px] font-bold tracking-[0.03em] text-slate-600">{inquiry.contact_method}</span><span className="block overflow-hidden text-ellipsis text-muted">{inquiry.contact}</span></td>
                  <td><StatusBadge status={inquiry.status} /></td>
                  <td>
                    <time className="grid gap-[3px] whitespace-nowrap" dateTime={inquiry.created_at}>
                      <span>{new Date(inquiry.created_at).toLocaleDateString()}</span>
                      <small className="text-[10px] text-muted">{new Date(inquiry.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small>
                    </time>
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-[5px] whitespace-nowrap">
                      <Link
                        className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-[7px] border border-transparent bg-transparent px-0 text-slate-500 no-underline transition-[background,border-color,color] duration-150 hover:bg-slate-900/5 hover:text-primary"
                        href={`/inquiries/${inquiry.id}`}
                        title="View inquiry"
                        aria-label="View inquiry"
                      >
                        <Eye size={15} />
                      </Link>
                      <button
                        className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-[7px] border border-transparent bg-transparent px-0 text-primary no-underline transition-[background,border-color,color] duration-150 hover:bg-blue-50"
                        type="button"
                        title={inquiry.status === "NEW" ? "Start inquiry" : inquiry.status === "IN_PROGRESS" ? "Resolve inquiry" : "Reopen inquiry"}
                        aria-label={inquiry.status === "NEW" ? "Start inquiry" : inquiry.status === "IN_PROGRESS" ? "Resolve inquiry" : "Reopen inquiry"}
                        onClick={() => void advance(inquiry)}
                      >
                        {inquiry.status === "RESOLVED" ? <RotateCcw size={15} /> : <ArrowRight size={15} />}
                      </button>
                      {role === "ADMIN" && (
                        <button
                          className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-[7px] border border-transparent bg-transparent px-0 text-slate-500 no-underline transition-[background,border-color,color] duration-150 hover:bg-red-50 hover:text-error"
                          type="button"
                          title="Delete inquiry"
                          aria-label="Delete inquiry"
                          onClick={() => void remove(inquiry)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <div className="flex min-h-[58px] items-center justify-between border-t border-border px-5 py-2.5 text-xs text-muted max-[760px]:gap-2.5">
          <span>{pagination.total === 0 ? "0 records" : `${(page - 1) * pagination.limit + 1}-${Math.min(page * pagination.limit, pagination.total)} of ${pagination.total}`}</span>
          <div className="flex gap-1.5">
            <button className="inline-flex min-h-[34px] items-center justify-center gap-[5px] rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] text-slate-600 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none disabled:opacity-100" type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={15} />Previous</button>
            <button className="inline-flex min-h-[34px] items-center justify-center gap-[5px] rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] text-slate-600 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none disabled:opacity-100" type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight size={15} /></button>
          </div>
        </div>
      </section>
    </>
  );
}
