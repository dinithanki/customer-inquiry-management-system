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

  if (loading) return <div className="loading-state">Loading inquiry...</div>;
  if (error && !inquiry) return <section className="panel"><div className="error-state"><h3>Unable to load inquiry</h3><p>{error}</p><button className="button button-secondary" type="button" onClick={() => void load()}>Reload</button></div></section>;
  if (!inquiry) return null;

  return (
    <>
      <PageHeader title={`Inquiry ${inquiry.id.slice(0, 8)}`} description="Customer information and status history." />
      {error && <div className="error-banner"><span>{error}</span><button className="text-button" type="button" onClick={() => void load()}>Reload</button></div>}
      <section className="details-grid">
        <article className="panel details-panel">
          <div className="panel-heading"><div><h2>Customer details</h2><p>Submitted inquiry information</p></div><StatusBadge status={inquiry.status} /></div>
          <dl className="details-list">
            <div><dt>Customer</dt><dd>{inquiry.customer_name}</dd></div>
            <div><dt>Contact method</dt><dd>{inquiry.contact_method}</dd></div>
            <div><dt>Contact</dt><dd>{inquiry.contact}</dd></div>
            <div><dt>Subject</dt><dd>{inquiry.subject}</dd></div>
            <div className="details-full"><dt>Description</dt><dd>{inquiry.description}</dd></div>
            <div><dt>Created by</dt><dd>{inquiry.created_by_name}</dd></div>
            <div><dt>Updated by</dt><dd>{inquiry.updated_by_name ?? "-"}</dd></div>
            <div><dt>Resolved by</dt><dd>{inquiry.resolved_by_name ?? "-"}</dd></div>
            <div><dt>Created</dt><dd>{new Date(inquiry.created_at).toLocaleString()}</dd></div>
            <div><dt>Updated</dt><dd>{new Date(inquiry.updated_at).toLocaleString()}</dd></div>
          </dl>
        </article>
        <aside className="panel status-panel">
          <div className="panel-heading"><div><h2>Status</h2><p>Valid lifecycle transitions</p></div></div>
          <div className="status-controls">
            <select className="form-input" value={status} onChange={(event) => setStatus(event.target.value as InquiryStatus)}>
              <option value="">Select status</option>
              {allowedTargets[inquiry.status].map((target) => <option value={target} key={target}>{target.replace("_", " ")}</option>)}
            </select>
            <button className="button button-primary" type="button" disabled={!status} onClick={() => void saveStatus()}>Update status</button>
          </div>
          <div className="history-list">
            <h3>Status history</h3>
            {inquiry.history.length === 0 ? <p>No history available.</p> : inquiry.history.map((item) => (
              <div className="history-item" key={item.id}><strong>{item.from_status ? `${item.from_status} -> ` : ""}{item.to_status}</strong><span>{item.changed_by_name} · {new Date(item.changed_at).toLocaleString()}</span></div>
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}
