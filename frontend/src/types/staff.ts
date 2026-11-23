export type Staff = {
  id: string;
  name: string;
  email: string;
  role: "STAFF";
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};
