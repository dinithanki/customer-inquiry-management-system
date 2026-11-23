import { api } from "@/lib/api";
import type { Staff } from "@/types/staff";

export type StaffListResult = {
  staff: Staff[];
  total: number;
  page: number;
  limit: number;
};

export async function listStaff(params: { page?: number; limit?: number; search?: string } = {}) {
  const { data } = await api.get<{ success: boolean; data: StaffListResult }>("/users", { params });
  return data.data;
}

export async function createStaff(input: { name: string; email: string }) {
  const { data } = await api.post<{ success: boolean; data: { staff: Staff; temporaryPassword: string } }>("/users", input);
  return data.data;
}

export async function updateStaff(id: string, input: { name?: string; email?: string }) {
  const { data } = await api.patch<{ success: boolean; data: { staff: Staff } }>(`/users/${id}`, input);
  return data.data.staff;
}

export async function setStaffStatus(id: string, isActive: boolean) {
  const { data } = await api.patch<{ success: boolean; data: { staff: Staff } }>(`/users/${id}/status`, { isActive });
  return data.data.staff;
}

export async function resetStaffPassword(id: string) {
  const { data } = await api.post<{
    success: boolean;
    data: { temporaryPassword: string; expiresIn: string; mustChangePassword: boolean };
  }>(`/users/${id}/reset-password`);
  return data.data;
}
