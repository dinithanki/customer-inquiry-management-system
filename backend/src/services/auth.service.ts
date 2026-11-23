
import bcrypt from "bcrypt";
import { pool } from "../config/database.js";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  is_active: boolean;
  must_change_password: boolean;
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthenticatedUser | null> {
  // Find the user using their email.
  const result = await pool.query<
    AuthenticatedUser & {
      password_hash: string;
      temporary_password_expires_at: Date | null;
    }
  >(
    `SELECT
       id,
       name,
       email,
       role,
       is_active,
       must_change_password,
       password_hash,
       temporary_password_expires_at
     FROM users
     WHERE email = $1`,
    [email]
  );

  const user = result.rows[0];

  // No account found.
  if (!user) {
    return null;
  }

  // Reject inactive accounts.
  if (!user.is_active) {
    return null;
  }

  // Compare the supplied password with the stored bcrypt hash.
  const passwordMatches = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatches) {
    return null;
  }

  // Check expiry only when the user must change a temporary password.
  if (user.must_change_password) {
    const expiry = user.temporary_password_expires_at;

    // Reject missing or expired temporary password expiry dates.
    if (!expiry || new Date(expiry).getTime() <= Date.now()) {
      return null;
    }
  }

  // Return only safe user information.
  const {
    password_hash,
    temporary_password_expires_at,
    ...authenticatedUser
  } = user;

  return authenticatedUser;
}
