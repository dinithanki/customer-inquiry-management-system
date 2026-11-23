"use client";

import axios from "axios";
import { use, useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { getInquiry, updateInquiryStatus } from "@/services/inquiry.service";
import type { InquiryDetails, InquiryStatus } from "@/types/inquiry";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";

const allowedTargets: Record<InquiryStatus, InquiryStatus[]> = {
  NEW: ["IN_PROGRESS", "RESOLVED"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["IN_PROGRESS"],
};

export default function InquiryDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [inquiry, setInquiry] = useState<InquiryDetails | null>(null);
  const [status, setStatus] = useState<InquiryStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getInquiry(id);
      setInquiry(data);
      setStatus("");
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const saveStatus = async () => {
    if (!inquiry || !status) return;
    setError("");
    try {
      const updated = await updateInquiryStatus(id, status, inquiry.version);
      await load();
      setStatus("");
      if (!updated) setError("Inquiry was updated.");
    } catch (saveError) {
      if (axios.isAxiosError(saveError) && saveError.response?.status === 409) {
        setError("This inquiry changed in another session. Reload before trying again.");
      } else {
        setError(getApiErrorMessage(saveError));
      }
    }
  };

  if (loading) return <div className="flex min-h-[220px] items-center justify-center text-muted">Loading inquiry...</div>;
  if (error && !inquiry) return <section className="rounded-xl border border-border bg-card shadow-card"><div className="flex min-h-[220px] flex-col items-center justify-center gap-2.5 text-center text-muted"><h3 className="mt-1 mb-0 text-[15px] font-bold text-text">Unable to load inquiry</h3><p className="m-0 max-w-[420px] text-xs leading-[1.6]">{error}</p><button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-[14px] text-[13px] font-semibold text-text hover:border-slate-300 hover:bg-surface-muted" type="button" onClick={() => void load()}>Reload</button></div></section>;
  if (!inquiry) return null;

  return (
    <>
      <PageHeader title={`Inquiry ${inquiry.id.slice(0, 8)}`} description="Customer information and status history." />
      {error && <div className="my-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-[11px] text-xs leading-[1.5] text-red-700"><span>{error}</span><button className="border-0 bg-transparent text-xs font-semibold text-red-700 underline" type="button" onClick={() => void load()}>Reload</button></div>}
      <section className="grid grid-cols-[minmax(0,1fr)_300px] gap-4 max-[760px]:grid-cols-1">
        <article className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex min-h-[72px] items-center justify-between gap-3 px-5 py-[14px]"><div><h2 className="mb-1 text-[15px] font-bold text-slate-800">Customer details</h2><p className="m-0 text-xs text-muted">Submitted inquiry information</p></div><StatusBadge status={inquiry.status} /></div>
          <dl className="grid grid-cols-2 px-5 pb-5 max-[760px]:grid-cols-1">
            <div className="border-t border-slate-100 py-[14px] pr-2.5"><dt className="text-[11px] text-muted">Customer</dt><dd className="mt-1.5 text-[13px] leading-[1.55] text-text">{inquiry.customer_name}</dd></div>
            <div className="border-t border-slate-100 py-[14px] pr-2.5"><dt className="text-[11px] text-muted">Contact method</dt><dd className="mt-1.5 text-[13px] leading-[1.55] text-text">{inquiry.contact_method}</dd></div>
            <div className="border-t border-slate-100 py-[14px] pr-2.5"><dt className="text-[11px] text-muted">Contact</dt><dd className="mt-1.5 text-[13px] leading-[1.55] text-text">{inquiry.contact}</dd></div>
            <div className="border-t border-slate-100 py-[14px] pr-2.5"><dt className="text-[11px] text-muted">Subject</dt><dd className="mt-1.5 text-[13px] leading-[1.55] text-text">{inquiry.subject}</dd></div>
            <div className="col-span-full border-t border-slate-100 py-[14px] pr-2.5 max-[760px]:col-span-1"><dt className="text-[11px] text-muted">Description</dt><dd className="mt-1.5 text-[13px] leading-[1.55] text-text">{inquiry.description}</dd></div>
            <div className="border-t border-slate-100 py-[14px] pr-2.5"><dt className="text-[11px] text-muted">Created by</dt><dd className="mt-1.5 text-[13px] leading-[1.55] text-text">{inquiry.created_by_name}</dd></div>
            <div className="border-t border-slate-100 py-[14px] pr-2.5"><dt className="text-[11px] text-muted">Updated by</dt><dd className="mt-1.5 text-[13px] leading-[1.55] text-text">{inquiry.updated_by_name ?? "-"}</dd></div>
            <div className="border-t border-slate-100 py-[14px] pr-2.5"><dt className="text-[11px] text-muted">Resolved by</dt><dd className="mt-1.5 text-[13px] leading-[1.55] text-text">{inquiry.resolved_by_name ?? "-"}</dd></div>
            <div className="border-t border-slate-100 py-[14px] pr-2.5"><dt className="text-[11px] text-muted">Created</dt><dd className="mt-1.5 text-[13px] leading-[1.55] text-text">{new Date(inquiry.created_at).toLocaleString()}</dd></div>
            <div className="border-t border-slate-100 py-[14px] pr-2.5"><dt className="text-[11px] text-muted">Updated</dt><dd className="mt-1.5 text-[13px] leading-[1.55] text-text">{new Date(inquiry.updated_at).toLocaleString()}</dd></div>
          </dl>
        </article>
        <aside className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex min-h-[72px] items-center justify-between gap-3 px-5 py-[14px]"><div><h2 className="mb-1 text-[15px] font-bold text-slate-800">Status</h2><p className="m-0 text-xs text-muted">Valid lifecycle transitions</p></div></div>
          <div className="grid gap-2.5 p-4">
            <select className="h-[42px] w-full rounded-lg border border-border bg-white px-[11px] text-[13px] font-normal text-text" value={status} onChange={(event) => setStatus(event.target.value as InquiryStatus)}>
              <option value="">Select status</option>
              {allowedTargets[inquiry.status].map((target) => <option value={target} key={target}>{target.replace("_", " ")}</option>)}
            </select>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-[14px] text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.16)] hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={!status} onClick={() => void saveStatus()}>Update status</button>
          </div>
          <div className="grid gap-2.5 border-t border-border p-4">
            <h3 className="m-0 text-[13px] font-bold text-slate-800">Status history</h3>
            {inquiry.history.length === 0 ? <p className="text-xs text-muted">No history available.</p> : inquiry.history.map((item) => (
              <div className="grid gap-[5px] border-l-2 border-blue-200 pl-2.5 text-[11px]" key={item.id}><strong className="text-text">{item.from_status ? `${item.from_status} -> ` : ""}{item.to_status}</strong><span className="text-muted">{item.changed_by_name} · {new Date(item.changed_at).toLocaleString()}</span></div>
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}
