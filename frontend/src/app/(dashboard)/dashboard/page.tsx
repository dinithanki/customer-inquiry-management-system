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
        <Link className="button button-primary" href="/inquiries/new"><CirclePlus size={17} /><span>New Inquiry</span></Link>
      } />
      {error && <div className="error-banner">{error}</div>}
      <section className="stats-grid" aria-label="Inquiry summary">
        <StatCard label="Total Inquiries" value={loading ? "—" : counts.TOTAL} hint="All active customer requests" icon={Inbox} />
        <StatCard label="New" value={loading ? "—" : counts.NEW} hint="Waiting for review" icon={CirclePlus} tone="blue" />
        <StatCard label="In Progress" value={loading ? "—" : counts.IN_PROGRESS} hint="Currently being handled" icon={LoaderCircle} tone="amber" />
        <StatCard label="Resolved" value={loading ? "—" : counts.RESOLVED} hint="Successfully completed" icon={CheckCircle2} tone="green" />
      </section>
      <section className="panel dashboard-recent-panel">
        <div className="panel-heading">
          <div><h2>Recent Inquiries</h2><p>Latest customer requests, newest first</p></div>
          <Link className="dashboard-view-all" href="/inquiries">View all <ArrowUpRight size={15} /></Link>
        </div>
        {loading ? <div className="loading-state">Loading inquiries...</div> : recent.length === 0 ? (
          <div className="empty-state"><span className="empty-icon"><Inbox size={20} /></span><h3>No inquiries yet</h3><p>Recent inquiries will appear here when they are available.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="dashboard-recent-table">
              <colgroup><col /><col /><col /><col /><col /></colgroup>
              <thead><tr><th>Customer</th><th>Subject</th><th>Status</th><th>Created</th><th aria-label="Actions"></th></tr></thead>
              <tbody>{recent.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td>
                    <div className="dashboard-customer">
                      <span className="dashboard-customer-avatar" aria-hidden="true">{inquiry.customer_name.trim().charAt(0).toUpperCase()}</span>
                      <span><strong>{inquiry.customer_name}</strong><small>#{inquiry.id.slice(0, 8)}</small></span>
                    </div>
                  </td>
                  <td className="dashboard-subject" title={inquiry.subject}>{inquiry.subject}</td>
                  <td><StatusBadge status={inquiry.status} /></td>
                  <td className="dashboard-created">
                    <time dateTime={inquiry.created_at}>
                      <span>{new Date(inquiry.created_at).toLocaleDateString()}</span>
                      <small>{new Date(inquiry.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small>
                    </time>
                  </td>
                  <td><Link className="dashboard-view-link" href={`/inquiries/${inquiry.id}`}>View details</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
