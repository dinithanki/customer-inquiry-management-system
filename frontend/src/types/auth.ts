export type UserRole = "ADMIN" | "STAFF";

export type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  role: UserRole;
  is_active?: boolean;
  must_change_password?: boolean;
};
