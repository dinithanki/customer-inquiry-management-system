"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CirclePlus, Inbox, LoaderCircle, Search, Trash2, Eye, ArrowRight, RotateCcw } from "lucide-react";
import { getApiErrorMessage } from "@/lib/api";
import { deleteInquiry, listInquiries, getInquiry, updateInquiryStatus } from "@/services/inquiry.service";
import type { InquiryListItem, InquiryStatus } from "@/types/inquiry";
import { useAuthStore } from "@/store/auth.store";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

const emptyPagination = { page: 1, limit: 10, total: 0, totalPages: 0 };

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
        <Link className="button button-primary" href="/inquiries/new"><CirclePlus size={17} /><span>New Inquiry</span></Link>
      } />
      {error && <div className="error-banner">{error}</div>}
      <section className="stats-grid" aria-label="Inquiry summary">
        <StatCard label="Total Inquiries" value={counts.TOTAL} hint="Across all active inquiries" icon={Inbox} />
        <StatCard label="New" value={counts.NEW} hint="Waiting for review" icon={CirclePlus} />
        <StatCard label="In Progress" value={counts.IN_PROGRESS} hint="Currently being handled" icon={LoaderCircle} />
        <StatCard label="Resolved" value={counts.RESOLVED} hint="Completed inquiries" icon={CheckCircle2} />
      </section>
      <section className="panel">
        <div className="toolbar">
          <form className="search-field" onSubmit={(event) => { event.preventDefault(); setPage(1); void load(); }}>
            <Search size={16} />
            <input aria-label="Search inquiries" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by customer or subject" />
          </form>
          <select className="filter-field" aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value as InquiryStatus | ""); setPage(1); }}>
            <option value="">All statuses</option><option value="NEW">New</option><option value="IN_PROGRESS">In Progress</option><option value="RESOLVED">Resolved</option>
          </select>
        </div>
        {loading ? <div className="loading-state">Loading inquiries...</div> : inquiries.length === 0 ? (
          <div className="empty-state"><span className="empty-icon"><Inbox size={20} /></span><h3>No inquiries found</h3><p>Try changing your search or filters.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="inquiry-table">
              <colgroup><col /><col /><col /><col /><col /><col /><col /></colgroup>
              <thead><tr><th>Inquiry ID</th><th>Customer Name</th><th>Contact</th><th>Subject</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>{inquiries.map((inquiry) => (
                <tr className={`inquiry-row inquiry-row-${inquiry.status.toLowerCase()}`} key={inquiry.id}>
                  <td><code>{inquiry.id.slice(0, 8)}</code></td>
                  <td><strong>{inquiry.customer_name}</strong></td>
                  <td><span className="contact-method">{inquiry.contact_method}</span><span className="muted contact-value">{inquiry.contact}</span></td>
                  <td title={inquiry.subject}>{inquiry.subject}</td>
                  <td><StatusBadge status={inquiry.status} /></td>
                  <td className="inquiry-date">
                    <time dateTime={inquiry.created_at}>
                      <span>{new Date(inquiry.created_at).toLocaleDateString()}</span>
                      <small>{new Date(inquiry.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small>
                    </time>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link
                        className="table-action-button table-action-icon"
                        href={`/inquiries/${inquiry.id}`}
                        title="View inquiry"
                        aria-label="View inquiry"
                      >
                        <Eye size={15} />
                      </Link>
                      <button
                        className="table-action-button table-action-primary table-action-icon"
                        type="button"
                        title={inquiry.status === "NEW" ? "Start inquiry" : inquiry.status === "IN_PROGRESS" ? "Resolve inquiry" : "Reopen inquiry"}
                        aria-label={inquiry.status === "NEW" ? "Start inquiry" : inquiry.status === "IN_PROGRESS" ? "Resolve inquiry" : "Reopen inquiry"}
                        onClick={() => void advance(inquiry)}
                      >
                        {inquiry.status === "RESOLVED" ? <RotateCcw size={15} /> : <ArrowRight size={15} />}
                      </button>
                      {role === "ADMIN" && (
                        <button
                          className="table-action-button table-action-danger table-action-icon"
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
        <div className="pagination">
          <span>{pagination.total === 0 ? "0 records" : `${(page - 1) * pagination.limit + 1}-${Math.min(page * pagination.limit, pagination.total)} of ${pagination.total}`}</span>
          <div><button className="button button-secondary" type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button className="button button-secondary" type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div>
        </div>
      </section>
    </>
  );
}
