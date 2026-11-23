
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
  const result = await pool.query<AuthenticatedUser & { password_hash: string }>(
    `SELECT
       id,
       name,
       email,
       role,
       is_active,
       must_change_password,
       password_hash
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

  // Return only safe user information.
  const { password_hash, ...authenticatedUser } = user;

  return authenticatedUser;
}
