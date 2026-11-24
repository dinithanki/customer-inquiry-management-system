"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, CirclePlus, Inbox, LoaderCircle } from "lucide-react";
import { getApiErrorMessage } from "@/lib/api";
import { listInquiries } from "@/services/inquiry.service";
import type { InquiryListItem, InquiryStatus } from "@/types/inquiry";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function DashboardPage() {
  const [recent, setRecent] = useState<InquiryListItem[]>([]);
  const [counts, setCounts] = useState<Record<InquiryStatus | "TOTAL", number>>({ TOTAL: 0, NEW: 0, IN_PROGRESS: 0, RESOLVED: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [all, newData, progress, resolved, recentData] = await Promise.all([
          listInquiries({ page: 1, limit: 1 }),
          listInquiries({ page: 1, limit: 1, status: "NEW" }),
          listInquiries({ page: 1, limit: 1, status: "IN_PROGRESS" }),
          listInquiries({ page: 1, limit: 1, status: "RESOLVED" }),
          listInquiries({ page: 1, limit: 5 }),
        ]);
        setCounts({
          TOTAL: all.pagination.total,
          NEW: newData.pagination.total,
          IN_PROGRESS: progress.pagination.total,
          RESOLVED: resolved.pagination.total,
        });
        setRecent(recentData.data);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of customer inquiries and their current status." action={
        <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-[14px] text-[13px] font-semibold text-white no-underline shadow-[0_4px_12px_rgba(37,99,235,0.16)] hover:bg-blue-700 max-[420px]:[&_span]:hidden" href="/inquiries/new"><CirclePlus size={17} /><span>New Inquiry</span></Link>
      } />
      {error && <div className="mx-5 my-4 rounded-lg border border-red-200 bg-red-50 px-3 py-[11px] text-xs leading-[1.5] text-red-700">{error}</div>}
      <section className="mb-6 grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[420px]:gap-3 max-[420px]:grid-cols-2" aria-label="Inquiry summary">
        <StatCard label="Total Inquiries" value={loading ? "—" : counts.TOTAL} hint="All active customer requests" icon={Inbox} />
        <StatCard label="New" value={loading ? "—" : counts.NEW} hint="Waiting for review" icon={CirclePlus} tone="blue" />
        <StatCard label="In Progress" value={loading ? "—" : counts.IN_PROGRESS} hint="Currently being handled" icon={LoaderCircle} tone="amber" />
        <StatCard label="Resolved" value={loading ? "—" : counts.RESOLVED} hint="Successfully completed" icon={CheckCircle2} tone="green" />
      </section>
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="flex min-h-20 items-center justify-between gap-3 px-[22px] py-[17px]">
          <div><h2 className="mb-1 text-base font-bold text-slate-800">Recent Inquiries</h2><p className="m-0 text-xs text-muted">Latest customer requests, newest first</p></div>
          <Link className="inline-flex items-center gap-[5px] text-xs font-semibold text-primary no-underline hover:text-blue-700" href="/inquiries">View all <ArrowUpRight size={15} /></Link>
        </div>
        {loading ? <div className="flex min-h-[220px] items-center justify-center text-muted">Loading inquiries...</div> : recent.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2.5 text-center text-muted"><span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-primary"><Inbox size={20} /></span><h3 className="mt-1 mb-0 text-[15px] font-bold text-text">No inquiries yet</h3><p className="m-0 max-w-[420px] text-xs leading-[1.6]">Recent inquiries will appear here when they are available.</p></div>
        ) : (
          <>
          <div className="hidden space-y-2 p-3 max-[640px]:grid">
            {recent.map((inquiry) => (
              <Link key={inquiry.id} href={`/inquiries/${inquiry.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 text-inherit no-underline shadow-sm transition hover:border-blue-200">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-sm text-slate-800">{inquiry.customer_name}</strong><span className="mt-1 block text-[10px] text-muted">#{inquiry.id.slice(0, 8)}</span></div><StatusBadge status={inquiry.status} /></div>
                <p className="mb-0 mt-3 line-clamp-2 text-xs font-medium text-slate-700">{inquiry.subject}</p><time className="mt-2 block text-[10px] text-muted" dateTime={inquiry.created_at}>{new Date(inquiry.created_at).toLocaleDateString()}</time>
              </Link>
            ))}
          </div>
          <div className="overflow-x-auto max-[640px]:hidden">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-xs [&_td]:h-[68px] [&_td]:border-b [&_td]:border-slate-100 [&_td]:align-middle [&_td]:text-text [&_tbody_tr:last-child_td]:border-b-0">
              <colgroup><col className="w-[27%]" /><col className="w-[28%]" /><col className="w-[17%]" /><col className="w-[15%]" /><col className="w-[13%]" /></colgroup>
              <thead><tr><th scope="col" className="h-11 border-b border-border bg-slate-50/80 px-3.5 text-left text-[10px] font-bold uppercase tracking-[0.07em] whitespace-nowrap text-slate-500">Customer</th><th scope="col" className="h-11 border-b border-border bg-slate-50/80 px-3.5 text-left text-[10px] font-bold uppercase tracking-[0.07em] whitespace-nowrap text-slate-500">Subject</th><th scope="col" className="h-11 border-b border-border bg-slate-50/80 px-3.5 text-left text-[10px] font-bold uppercase tracking-[0.07em] whitespace-nowrap text-slate-500">Status</th><th scope="col" className="h-11 border-b border-border bg-slate-50/80 px-3.5 text-left text-[10px] font-bold uppercase tracking-[0.07em] whitespace-nowrap text-slate-500">Created</th><th scope="col" className="h-11 border-b border-border bg-slate-50/80 px-3.5 text-center text-[10px] font-bold uppercase tracking-[0.07em] whitespace-nowrap text-slate-500" aria-label="Actions"></th></tr></thead>
              <tbody>{recent.map((inquiry) => (
                <tr className="transition-colors duration-[140ms] hover:bg-blue-50/40" key={inquiry.id}>
                  <td>
                    <div className="flex min-w-0 items-center gap-3 px-3.5 py-2">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-blue-100 bg-blue-50 text-xs font-bold text-primary" aria-hidden="true">{inquiry.customer_name.trim().charAt(0).toUpperCase()}</span>
                      <span className="grid min-w-0 gap-1"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-semibold text-slate-800">{inquiry.customer_name}</strong><small className="text-[10px] font-medium tracking-wide text-slate-400">#{inquiry.id.slice(0, 8)}</small></span>
                    </div>
                  </td>
                  <td className="overflow-hidden text-ellipsis whitespace-nowrap px-3.5 py-2 text-[12px] font-medium text-slate-700" title={inquiry.subject}>{inquiry.subject}</td>
                  <td className="px-3.5 py-2"><StatusBadge status={inquiry.status} /></td>
                  <td className="px-3.5 py-2">
                    <time className="grid gap-[3px] whitespace-nowrap" dateTime={inquiry.created_at}>
                      <span>{new Date(inquiry.created_at).toLocaleDateString()}</span>
                      <small className="text-[10px] text-slate-400">{new Date(inquiry.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small>
                    </time>
                  </td>
                  <td className="px-3.5 py-2 text-center"><Link className="inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-md px-2 text-[11px] font-semibold text-primary no-underline transition-colors hover:bg-blue-50 hover:text-blue-700" href={`/inquiries/${inquiry.id}`}>View details <ArrowUpRight size={13} className="ml-1" /></Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </>
  );
}
