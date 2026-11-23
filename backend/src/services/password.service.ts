
import bcrypt from "bcrypt";
import { pool } from "../config/database.js";

interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export async function changeUserPassword(
  input: ChangePasswordInput
): Promise<
  "SUCCESS" | "INVALID_CURRENT_PASSWORD" | "USER_NOT_FOUND"
> {
  const result = await pool.query<{
    password_hash: string;
  }>(
    `SELECT password_hash
     FROM users
     WHERE id = $1
       AND is_active = TRUE`,
    [input.userId]
  );

  const user = result.rows[0];

  if (!user) {
    return "USER_NOT_FOUND";
  }

  const isCurrentPasswordValid = await bcrypt.compare(
    input.currentPassword,
    user.password_hash
  );

  if (!isCurrentPasswordValid) {
    return "INVALID_CURRENT_PASSWORD";
  }

  const newPasswordHash = await bcrypt.hash(
    input.newPassword,
    12
  );

  await pool.query(
    `UPDATE users
     SET password_hash = $1,
         must_change_password = FALSE,
         temporary_password_expires_at = NULL,
         updated_at = NOW()
     WHERE id = $2`,
    [newPasswordHash, input.userId]
  );

  return "SUCCESS";
}
