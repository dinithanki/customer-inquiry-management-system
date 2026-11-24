"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ChevronLeft, ChevronRight, KeyRound, Pencil, Plus, Search } from "lucide-react";
import { getApiErrorMessage } from "@/lib/api";
import { createStaff, listStaff, resetStaffPassword, setStaffStatus, updateStaff } from "@/services/staff.service";
import type { Staff } from "@/types/staff";
import { useAuthStore } from "@/store/auth.store";
import { PageHeader } from "@/components/ui/PageHeader";

const staffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
});

type StaffValues = z.infer<typeof staffSchema>;

export default function StaffManagementClient() {
  const role = useAuthStore((state) => state.user?.role);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"created_at" | "name" | "email">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StaffValues>({
    resolver: zodResolver(staffSchema),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listStaff({ page, limit, search: search || undefined, sortBy, sortOrder });
      setStaff(data.staff);
      setTotal(data.total);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [limit, page, search, sortBy, sortOrder]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  if (role !== "ADMIN") {
    return <section className="rounded-xl border border-border bg-card shadow-card"><div className="flex min-h-[220px] flex-col items-center justify-center gap-2.5 text-center text-muted"><h3 className="mt-1 mb-0 text-[15px] text-text">Access denied</h3><p className="m-0 max-w-[420px] text-xs leading-[1.6]">Staff management is available to administrators only.</p></div></section>;
  }

  const create = async (values: StaffValues) => {
    setError("");
    try {
      const data = await createStaff(values);
      setTemporaryPassword(data.temporaryPassword);
      reset();
      setShowCreate(false);
      await load();
    } catch (createError) {
      setError(getApiErrorMessage(createError));
    }
  };

  const edit = async (member: Staff) => {
    const name = window.prompt("Staff name", member.name)?.trim();
    if (!name) return;
    const email = window.prompt("Staff email", member.email)?.trim();
    if (!email) return;
    try {
      await updateStaff(member.id, { name, email });
      await load();
    } catch (editError) {
      setError(getApiErrorMessage(editError));
    }
  };

  const toggleStatus = async (member: Staff) => {
    try {
      await setStaffStatus(member.id, !member.is_active);
      await load();
    } catch (statusError) {
      setError(getApiErrorMessage(statusError));
    }
  };

  const resetPassword = async (member: Staff) => {
    if (!window.confirm(`Reset password for ${member.name}?`)) return;
    try {
      const data = await resetStaffPassword(member.id);
      setTemporaryPassword(data.temporaryPassword);
      await load();
    } catch (resetError) {
      setError(getApiErrorMessage(resetError));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <PageHeader title="Staff Management" description="Administer staff accounts and access." action={
        <button className="inline-flex min-h-[38px] w-[120px] shrink-0 items-center justify-center gap-2 rounded-[9px] bg-primary px-3 text-xs font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.08),0_4px_9px_rgba(37,99,235,0.15)] transition-[transform,background,box-shadow] duration-[140ms] hover:-translate-y-px hover:bg-blue-700 hover:shadow-[0_2px_5px_rgba(15,23,42,0.1),0_6px_12px_rgba(37,99,235,0.2)] active:translate-y-0 max-[420px]:min-h-11 max-[420px]:w-11 max-[420px]:px-0" type="button" onClick={() => setShowCreate((value) => !value)}>
          <Plus size={16} />
          <span className="max-[420px]:hidden">Add User</span>
        </button>
      } />
      {error && <div className="mx-5 my-4 rounded-lg border border-red-200 bg-red-50 px-3 py-[11px] text-xs leading-[1.5] text-red-700">{error}</div>}
      {temporaryPassword && (
        <div className="mx-5 my-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-[11px] text-xs leading-[1.5] text-amber-800">
          <div className="grid gap-1.5"><strong>Temporary password</strong><code className="select-all text-[13px]">{temporaryPassword}</code></div>
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-[14px] text-[13px] font-semibold text-text hover:border-slate-300 hover:bg-surface-muted" type="button" onClick={() => void navigator.clipboard.writeText(temporaryPassword)}>Copy</button>
        </div>
      )}
      {showCreate && (
        <section className="mb-4 rounded-xl border border-border bg-card pb-[18px] shadow-card">
          <div className="flex min-h-[72px] items-center justify-between gap-3 px-5 py-[14px]"><div><h2 className="mb-1 text-[15px] font-bold text-slate-800">Create staff account</h2><p className="m-0 text-xs text-muted">The account will receive a temporary password.</p></div></div>
          <form className="grid gap-[14px] px-5 pt-[18px]" onSubmit={handleSubmit(create)} noValidate>
            <label className="grid gap-[7px] text-xs font-semibold text-slate-600">Name<input className="h-[42px] w-full rounded-lg border border-border bg-white px-[11px] text-[13px] font-normal text-text" {...register("name")} />{errors.name && <span className="text-[11px] font-normal text-error">{errors.name.message}</span>}</label>
            <label className="grid gap-[7px] text-xs font-semibold text-slate-600">Email<input className="h-[42px] w-full rounded-lg border border-border bg-white px-[11px] text-[13px] font-normal text-text" type="email" {...register("email")} />{errors.email && <span className="text-[11px] font-normal text-error">{errors.email.message}</span>}</label>
            <div className="mt-1 flex justify-end gap-2 border-t border-border pt-[14px]"><button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-[14px] text-[13px] font-semibold text-text hover:border-slate-300 hover:bg-surface-muted" type="button" onClick={() => setShowCreate(false)}>Cancel</button><button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-[14px] text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.16)] hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Staff"}</button></div>
          </form>
        </section>
      )}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="flex min-h-16 flex-col gap-2.5 border-b border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex h-10 w-full items-center gap-2 rounded-lg border border-border px-2.5 text-muted transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-blue-100 sm:max-w-[360px]"><Search size={16} /><input className="w-full border-0 bg-transparent text-[13px] text-text outline-none placeholder:text-slate-400" aria-label="Search staff" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or email" /></div><select className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-blue-100 sm:w-48" aria-label="Sort staff" value={`${sortBy}:${sortOrder}`} onChange={(event) => { const [nextSortBy, nextSortOrder] = event.target.value.split(":") as [typeof sortBy, typeof sortOrder]; setSortBy(nextSortBy); setSortOrder(nextSortOrder); setPage(1); }}><option value="created_at:desc">Newest first</option><option value="created_at:asc">Oldest first</option><option value="name:asc">Name A–Z</option><option value="name:desc">Name Z–A</option><option value="email:asc">Email A–Z</option><option value="email:desc">Email Z–A</option></select></div>
        {loading ? <div className="flex min-h-[220px] items-center justify-center text-muted">Loading staff...</div> : staff.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2.5 text-center text-muted"><h3 className="mt-1 mb-0 text-[15px] text-text">No staff found</h3><p className="m-0 max-w-[420px] text-xs leading-[1.6]">Create a staff account to get started.</p></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] table-fixed border-collapse text-xs [&_td]:h-[68px] [&_td]:border-b [&_td]:border-slate-100 [&_td]:px-3.5 [&_td]:py-2 [&_td]:align-middle [&_td]:text-text [&_tbody_tr:last-child_td]:border-b-0 [&_th]:h-12 [&_th]:border-b [&_th]:border-border [&_th]:bg-slate-50/80 [&_th]:px-3.5 [&_th]:text-left [&_th]:text-[10px] [&_th]:font-bold [&_th]:tracking-[0.07em] [&_th]:text-slate-500 [&_th]:uppercase [&_th]:whitespace-nowrap [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-[140ms] [&_tbody_tr:hover]:bg-blue-50/40">
            <colgroup><col className="w-[21%]" /><col className="w-[22%]" /><col className="w-[14%]" /><col className="w-[21%]" /><col className="w-[22%]" /></colgroup>
            <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Password</th><th>Actions</th></tr></thead>
            <tbody>{staff.map((member) => (
              <tr key={member.id}>
                <td>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-blue-100 bg-blue-50 text-xs font-bold text-primary" aria-hidden="true">{member.name.trim().charAt(0).toUpperCase()}</span>
                    <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-semibold text-slate-800">{member.name}</strong>
                  </div>
                </td>
                <td className="text-slate-500">{member.email}</td>
                <td><span className={`inline-flex min-h-[26px] items-center gap-[7px] whitespace-nowrap rounded-full px-[9px] text-[11px] font-bold ${member.is_active ? "bg-green-50 text-success before:size-[7px] before:rounded-full before:bg-current before:content-['']" : "bg-slate-100 text-slate-500"}`}>{member.is_active ? "Active" : "Inactive"}</span></td>
                <td><span className={`inline-flex min-h-[25px] items-center whitespace-nowrap rounded-full px-[9px] text-[10px] font-semibold ${member.must_change_password ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{member.must_change_password ? "Temporary password" : "Password changed"}</span></td>
                <td>
                  <div className="flex items-center justify-start gap-1 whitespace-nowrap">
                    <button className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-primary" type="button" title="Edit staff member" aria-label={`Edit ${member.name}`} onClick={() => void edit(member)}><Pencil size={15} /></button>
                    <button className={`inline-flex h-9 min-w-[82px] items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold transition-colors ${member.is_active ? "text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-error" : "text-success hover:border-green-200 hover:bg-green-50"}`} type="button" aria-label={`${member.is_active ? "Deactivate" : "Activate"} ${member.name}`} onClick={() => void toggleStatus(member)}>
                      {member.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-primary" type="button" title="Reset password" aria-label={`Reset password for ${member.name}`} onClick={() => void resetPassword(member)}><KeyRound size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        <div className="flex min-h-[58px] items-center justify-between border-t border-border px-5 py-2.5 text-xs text-muted"><span>{total} staff accounts</span><div className="flex gap-1.5">
          <button className="inline-flex min-h-[34px] items-center justify-center gap-[5px] rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] text-slate-600 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none disabled:opacity-100" type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={15} />Previous</button>
          <button className="inline-flex min-h-[34px] items-center justify-center gap-[5px] rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] text-slate-600 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none disabled:opacity-100" type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight size={15} /></button>
        </div></div>
      </section>
    </>
  );
}
