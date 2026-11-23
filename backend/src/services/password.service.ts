
import bcrypt from "bcrypt";
import { pool } from "../config/database.js";

interface ChangePasswordInput {
  userId: string;
  currentSessionId: string;
  currentPassword: string;
  newPassword: string;
}

export async function changeUserPassword(
  input: ChangePasswordInput
): Promise<
  "SUCCESS" | "INVALID_CURRENT_PASSWORD" | "USER_NOT_FOUND"
> {
  const client = await pool.connect();

  let transactionStarted = false;

  try {
    // 1. Start a database transaction.
    await client.query("BEGIN");
    transactionStarted = true;

    // 2. Find and lock the active user's row.
    const result = await client.query<{
      password_hash: string;
    }>(
      `SELECT password_hash
       FROM users
       WHERE id = $1
         AND is_active = TRUE
       FOR UPDATE`,
      [input.userId]
    );

    const user = result.rows[0];

    if (!user) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return "USER_NOT_FOUND";
    }

    // 3. Verify the current password.
    const isCurrentPasswordValid = await bcrypt.compare(
      input.currentPassword,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return "INVALID_CURRENT_PASSWORD";
    }

    // 4. Generate the new password hash.
    const newPasswordHash = await bcrypt.hash(
      input.newPassword,
      12
    );

    // 5. Update the user's password.
    const updateResult = await client.query(
      `UPDATE users
       SET password_hash = $1,
           must_change_password = FALSE,
           temporary_password_expires_at = NULL,
           updated_at = NOW()
       WHERE id = $2
         AND is_active = TRUE`,
      [newPasswordHash, input.userId]
    );

    if (updateResult.rowCount !== 1) {
      throw new Error("Failed to update user password.");
    }

    // 6. Revoke all other active sessions.
    await client.query(
      `UPDATE sessions
       SET revoked_at = NOW()
       WHERE user_id = $1
         AND id <> $2
         AND revoked_at IS NULL`,
      [input.userId, input.currentSessionId]
    );

    // 7. Commit both operations together.
    await client.query("COMMIT");
    transactionStarted = false;

    return "SUCCESS";
  } catch (error) {
    // Roll back if any operation fails.
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Password change rollback failed:",
          rollbackError
        );
      }
    }

    throw error;
  } finally {
    // Always return the connection to the pool.
    client.release();
  }
}
