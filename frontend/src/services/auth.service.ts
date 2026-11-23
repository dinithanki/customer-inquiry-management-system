import { api } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

type AuthResponse = {
  success: boolean;
  message: string;
  data: { user: AuthUser };
};

export async function login(email: string, password: string): Promise<AuthUser> {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  return data.data.user;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { data } = await api.get<{ success: boolean; data: { user: AuthUser } }>("/auth/me");
  return data.data.user;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const { data } = await api.post<{ success: boolean; message: string }>("/auth/change-password", input);
  return data;
}
