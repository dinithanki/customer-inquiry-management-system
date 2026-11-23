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
      const data = await listStaff({ page, limit, search: search || undefined });
      setStaff(data.staff);
      setTotal(data.total);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [limit, page, search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  if (role !== "ADMIN") {
    return <section className="panel"><div className="error-state"><h3>Access denied</h3><p>Staff management is available to administrators only.</p></div></section>;
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
        <button className="button button-primary staff-create-button" type="button" onClick={() => setShowCreate((value) => !value)}>
          <Plus size={16} />
          <span>Add User</span>
        </button>
      } />
      {error && <div className="error-banner">{error}</div>}
      {temporaryPassword && (
        <div className="warning-banner temporary-password">
          <div><strong>Temporary password</strong><code>{temporaryPassword}</code></div>
          <button className="button button-secondary" type="button" onClick={() => void navigator.clipboard.writeText(temporaryPassword)}>Copy</button>
        </div>
      )}
      {showCreate && (
        <section className="panel form-panel">
          <div className="panel-heading"><div><h2>Create staff account</h2><p>The account will receive a temporary password.</p></div></div>
          <form className="inquiry-form" onSubmit={handleSubmit(create)} noValidate>
            <label className="form-label">Name<input className="form-input" {...register("name")} />{errors.name && <span className="field-error">{errors.name.message}</span>}</label>
            <label className="form-label">Email<input className="form-input" type="email" {...register("email")} />{errors.email && <span className="field-error">{errors.email.message}</span>}</label>
            <div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button><button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Staff"}</button></div>
          </form>
        </section>
      )}
      <section className="panel">
        <div className="toolbar"><div className="search-field"><Search size={16} /><input aria-label="Search staff" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or email" /></div></div>
        {loading ? <div className="loading-state">Loading staff...</div> : staff.length === 0 ? (
          <div className="empty-state"><h3>No staff found</h3><p>Create a staff account to get started.</p></div>
        ) : (
          <div className="table-wrap"><table className="staff-table">
            <colgroup><col /><col /><col /><col /><col /></colgroup>
            <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Password</th><th>Actions</th></tr></thead>
            <tbody>{staff.map((member) => (
              <tr key={member.id}>
                <td>
                  <div className="staff-name-cell">
                    <span className="staff-avatar" aria-hidden="true">{member.name.trim().charAt(0).toUpperCase()}</span>
                    <strong>{member.name}</strong>
                  </div>
                </td>
                <td className="staff-email">{member.email}</td>
                <td><span className={`status-badge ${member.is_active ? "status-resolved" : "staff-status-inactive"}`}>{member.is_active ? "Active" : "Inactive"}</span></td>
                <td><span className={`staff-password-pill${member.must_change_password ? " temporary" : ""}`}>{member.must_change_password ? "Temporary password" : "Password changed"}</span></td>
                <td>
                  <div className="table-actions">
                    <button className="table-action-button table-action-icon" type="button" title="Edit staff member" aria-label={`Edit ${member.name}`} onClick={() => void edit(member)}><Pencil size={15} /></button>
                    <button className={`staff-status-action${member.is_active ? " deactivate" : " activate"}`} type="button" aria-label={`${member.is_active ? "Deactivate" : "Activate"} ${member.name}`} onClick={() => void toggleStatus(member)}>
                      {member.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button className="table-action-button table-action-icon" type="button" title="Reset password" aria-label={`Reset password for ${member.name}`} onClick={() => void resetPassword(member)}><KeyRound size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        <div className="pagination"><span>{total} staff accounts</span><div>
          <button className="button pagination-button" type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={15} />Previous</button>
          <button className="button pagination-button" type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight size={15} /></button>
        </div></div>
      </section>
    </>
  );
}
