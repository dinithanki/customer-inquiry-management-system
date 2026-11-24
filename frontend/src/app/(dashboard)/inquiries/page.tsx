
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Eye,
  Inbox,
  LoaderCircle,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import { getApiErrorMessage } from "@/lib/api";
import {
  deleteInquiry,
  listInquiries,
  getInquiry,
  updateInquiryStatus,
} from "@/services/inquiry.service";

import type {
  InquiryListItem,
  InquiryStatus,
} from "@/types/inquiry";

import { useAuthStore } from "@/store/auth.store";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

const emptyPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

export default function InquiriesPage() {
  const role = useAuthStore((state) => state.user?.role);

  const [inquiries, setInquiries] = useState<InquiryListItem[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);

  const [counts, setCounts] = useState<
    Record<InquiryStatus | "TOTAL", number>
  >({
    TOTAL: 0,
    NEW: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InquiryStatus | "">("");
  const [sortBy, setSortBy] = useState<"created_at" | "customer_name">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inquiryToDelete, setInquiryToDelete] = useState<InquiryListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [list, all, newData, progress, resolved] =
        await Promise.all([
          listInquiries({
            page,
            limit: 10,
            search: search || undefined,
            status: status || undefined,
            sortBy,
            sortOrder,
          }),
          listInquiries({ page: 1, limit: 1 }),
          listInquiries({
            page: 1,
            limit: 1,
            status: "NEW",
          }),
          listInquiries({
            page: 1,
            limit: 1,
            status: "IN_PROGRESS",
          }),
          listInquiries({
            page: 1,
            limit: 1,
            status: "RESOLVED",
          }),
        ]);

      setInquiries(list.data);
      setPagination(list.pagination);

      setCounts({
        TOTAL: all.pagination.total,
        NEW: newData.pagination.total,
        IN_PROGRESS: progress.pagination.total,
        RESOLVED: resolved.pagination.total,
      });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, search, status, sortBy, sortOrder]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    if (!inquiryToDelete || isDeleting) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInquiryToDelete(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inquiryToDelete, isDeleting]);

  const advance = async (inquiry: InquiryListItem) => {
    const next: InquiryStatus =
      inquiry.status === "NEW"
        ? "IN_PROGRESS"
        : inquiry.status === "IN_PROGRESS"
          ? "RESOLVED"
          : "IN_PROGRESS";

    try {
      const current = await getInquiry(inquiry.id);

      await updateInquiryStatus(
        inquiry.id,
        next,
        current.version
      );

      await load();
    } catch (updateError) {
      setError(getApiErrorMessage(updateError));
    }
  };

  const remove = async () => {
    if (!inquiryToDelete) return;
    setIsDeleting(true);
    try {
      await deleteInquiry(inquiryToDelete.id);
      setInquiryToDelete(null);
      await load();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Inquiries"
        description="Manage and track customer requests, update their status, and follow up efficiently."
        action={
          <Link
            href="/inquiries/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <CirclePlus size={17} />
            <span>New Inquiry</span>
          </Link>
        }
      />

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            className="font-semibold hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Statistics */}
      <section
        className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4"
        aria-label="Inquiry summary"
      >
        <StatCard
          label="Total Inquiries"
          value={counts.TOTAL}
          hint="Across all active inquiries"
          icon={Inbox}
        />

        <StatCard
          label="New"
          value={counts.NEW}
          hint="Waiting for review"
          icon={CirclePlus}
        />

        <StatCard
          label="In Progress"
          value={counts.IN_PROGRESS}
          hint="Currently being handled"
          icon={LoaderCircle}
        />

        <StatCard
          label="Resolved"
          value={counts.RESOLVED}
          hint="Completed inquiries"
          icon={CheckCircle2}
        />
      </section>

      {/* Inquiry table container */}
      <section className={`overflow-hidden rounded-xl border bg-white shadow-card ${role === "ADMIN" ? "border-blue-100 shadow-[0_2px_8px_rgba(37,99,235,0.05),0_8px_24px_rgba(15,23,42,0.04)]" : "border-border"}`}>

        {/* Search and filters */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">

          <form
            className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-border bg-white px-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-blue-100 sm:max-w-md"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              void load();
            }}
          >
            <Search
              size={17}
              className="shrink-0 text-muted"
            />

            <input
              className="w-full border-0 bg-transparent text-sm text-text outline-none placeholder:text-slate-400"
              aria-label="Search inquiries"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by customer or subject..."
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-white px-3 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-blue-100 sm:w-44 sm:flex-none"
              aria-label="Filter by status"
              value={status}
              onChange={(event) => {
                setStatus(
                  event.target.value as InquiryStatus | ""
                );
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            <select
              className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-white px-3 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-blue-100 sm:w-48 sm:flex-none"
              aria-label="Sort inquiries"
              value={`${sortBy}:${sortOrder}`}
              onChange={(event) => {
                const [nextSortBy, nextSortOrder] = event.target.value.split(":") as [typeof sortBy, typeof sortOrder];
                setSortBy(nextSortBy);
                setSortOrder(nextSortOrder);
                setPage(1);
              }}
            >
              <option value="created_at:desc">Newest first</option>
              <option value="created_at:asc">Oldest first</option>
              <option value="customer_name:asc">Customer A–Z</option>
              <option value="customer_name:desc">Customer Z–A</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatus("");
                setSortBy("created_at");
                setSortOrder("desc");
                setPage(1);
              }}
              className="h-10 shrink-0 rounded-lg border border-border bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center gap-3 text-sm text-muted">
            <LoaderCircle
              size={20}
              className="animate-spin text-primary"
            />
            Loading inquiries...
          </div>
        ) : inquiries.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-5 text-center">

            <span className="grid size-12 place-items-center rounded-xl bg-blue-50 text-primary">
              <Inbox size={23} />
            </span>

            <h3 className="text-base font-semibold text-text">
              No inquiries found
            </h3>

            <p className="max-w-sm text-sm text-muted">
              There are no inquiries matching your search.
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <>
          <div className="hidden space-y-3 p-3 max-[640px]:grid">
            {inquiries.map((inquiry) => (
              <article key={inquiry.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="m-0 truncate text-sm font-bold text-slate-800">{inquiry.customer_name}</p><code className="mt-1 block text-[10px] text-slate-400">#{inquiry.id.slice(0, 8)}</code></div><StatusBadge status={inquiry.status} /></div>
                <div className="mt-3 grid gap-1.5 text-xs"><span className="line-clamp-2 font-semibold text-slate-700">{inquiry.subject}</span><span className="font-medium text-slate-600">{inquiry.contact_method.replace("_", " ")}</span><span className="break-all text-muted">{inquiry.contact}</span><time className="text-muted" dateTime={inquiry.created_at}>{new Date(inquiry.created_at).toLocaleDateString()} · {new Date(inquiry.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></div>
                <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <Link href={`/inquiries/${inquiry.id}`} aria-label="View inquiry" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-primary no-underline"><Eye size={15} />View</Link>
                  <button type="button" aria-label={inquiry.status === "NEW" ? "Start inquiry" : inquiry.status === "IN_PROGRESS" ? "Resolve inquiry" : "Reopen inquiry"} onClick={() => void advance(inquiry)} className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600">{inquiry.status === "RESOLVED" ? <RotateCcw size={16} /> : <ArrowRight size={16} />}</button>
                  {role === "ADMIN" && <button type="button" aria-label="Delete inquiry" onClick={() => setInquiryToDelete(inquiry)} className="inline-flex size-10 items-center justify-center rounded-lg border border-red-100 text-red-600"><Trash2 size={16} /></button>}
                </div>
              </article>
            ))}
          </div>
          <div className="w-full overflow-x-auto max-[640px]:hidden">
            <table className="w-full min-w-[850px] table-fixed border-collapse text-sm">

              {/* Fixed column widths: total 100% */}
              <colgroup>
                <col style={{ width: "13%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>

              <thead>
                <tr className={`border-b border-border ${role === "ADMIN" ? "bg-blue-50/60" : "bg-slate-50/80"}`}>

                  <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Inquiry ID
                  </th>

                  <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>

                  <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Contact
                  </th>

                  <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Created Date
                  </th>

                  <th className="h-12 px-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {inquiries.map((inquiry) => (
                  <tr
                    key={inquiry.id}
                    className={`group h-[68px] bg-white transition-colors ${role === "ADMIN" ? "hover:bg-blue-50/40" : "hover:bg-slate-50/80"}`}
                  >

                    {/* Inquiry ID */}
                    <td className="overflow-hidden px-4 py-3 align-middle">
                      <code
                        className="block truncate rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                        title={inquiry.id}
                      >
                        {inquiry.id.slice(0, 8)}
                      </code>
                    </td>

                    {/* Customer */}
                    <td className="overflow-hidden px-4 py-3 align-middle">
                      <div
                        className="truncate font-semibold text-slate-800"
                        title={inquiry.customer_name}
                      >
                        {inquiry.customer_name}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="overflow-hidden px-4 py-3 align-middle">
                      <div
                        className="mb-1 truncate text-xs font-semibold text-slate-600"
                        title={inquiry.contact_method}
                      >
                        {inquiry.contact_method.replace("_", " ")}
                      </div>

                      <div
                        className="truncate text-xs text-muted"
                        title={inquiry.contact}
                      >
                        {inquiry.contact}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="overflow-hidden px-4 py-3 align-middle">
                      <StatusBadge status={inquiry.status} />
                    </td>

                    {/* Created date */}
                    <td className="overflow-hidden px-4 py-3 align-middle">
                      <time
                        className="block whitespace-nowrap text-xs font-medium text-slate-700"
                        dateTime={inquiry.created_at}
                      >
                        {new Date(
                          inquiry.created_at
                        ).toLocaleDateString()}
                      </time>

                      <span className="mt-1 block text-xs text-muted">
                        {new Date(
                          inquiry.created_at
                        ).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 align-middle">
                      <div className={`flex items-center justify-center ${role === "ADMIN" ? "gap-0.5" : "gap-1"}`}>

                        <Link
                          href={`/inquiries/${inquiry.id}`}
                          title="View inquiry"
                          aria-label="View inquiry"
                          className={`inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-primary ${role === "ADMIN" ? "size-8" : "size-9"}`}
                        >
                          <Eye size={16} />
                        </Link>

                        <button
                          type="button"
                          title={
                            inquiry.status === "NEW"
                              ? "Start inquiry"
                              : inquiry.status === "IN_PROGRESS"
                                ? "Resolve inquiry"
                                : "Reopen inquiry"
                          }
                          aria-label={
                            inquiry.status === "NEW"
                              ? "Start inquiry"
                              : inquiry.status === "IN_PROGRESS"
                                ? "Resolve inquiry"
                                : "Reopen inquiry"
                          }
                          onClick={() => void advance(inquiry)}
                          className={`inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-primary ${role === "ADMIN" ? "size-8" : "size-9"}`}
                        >
                          {inquiry.status === "RESOLVED" ? (
                            <RotateCcw size={16} />
                          ) : (
                            <ArrowRight size={16} />
                          )}
                        </button>

                        {role === "ADMIN" && (
                          <button
                            type="button"
                            title="Delete inquiry"
                            aria-label="Delete inquiry"
                            onClick={() => setInquiryToDelete(inquiry)}
                            className={`inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 ${role === "ADMIN" ? "size-8" : "size-9"}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                ))}

              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">

          <span className="text-xs font-medium text-muted">
            {pagination.total === 0
              ? "0 records"
              : `Showing ${
                  (page - 1) * pagination.limit + 1
                }–${Math.min(
                  page * pagination.limit,
                  pagination.total
                )} of ${pagination.total} inquiries`}
          </span>

          <div className="flex items-center gap-2">

            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={15} />
              Previous
            </button>

            <span className="px-2 text-xs font-semibold text-slate-700">
              {page} / {Math.max(pagination.totalPages, 1)}
            </span>

            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={15} />
            </button>

          </div>
        </div>
      </section>
      {inquiryToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeleting) setInquiryToDelete(null); }}>
          <section className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 shadow-[0_24px_70px_rgba(15,23,42,0.2)]" role="dialog" aria-modal="true" aria-labelledby="delete-inquiry-title" aria-describedby="delete-inquiry-description">
            <div className="mb-4 grid size-11 place-items-center rounded-xl bg-red-50 text-red-600"><Trash2 size={20} /></div>
            <h2 id="delete-inquiry-title" className="m-0 text-lg font-bold tracking-[-0.02em] text-text">Delete this inquiry?</h2>
            <p id="delete-inquiry-description" className="mb-0 mt-2 text-[13px] leading-5 text-muted">This will permanently delete inquiry <strong className="font-semibold text-slate-700">{inquiryToDelete.id.slice(0, 8)}</strong> and its record. This action can’t be undone.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-white px-[14px] text-[13px] font-semibold text-text hover:border-slate-300 hover:bg-surface-muted disabled:opacity-60" type="button" disabled={isDeleting} onClick={() => setInquiryToDelete(null)}>Cancel</button>
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-[14px] text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(220,38,38,0.16)] transition-colors hover:bg-red-700 disabled:cursor-wait disabled:opacity-70" type="button" disabled={isDeleting} onClick={() => void remove()}><Trash2 size={15} />{isDeleting ? "Deleting…" : "Delete inquiry"}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
