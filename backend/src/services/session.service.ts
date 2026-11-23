
import { pool } from "../config/database.js";
import { hashRefreshToken } from "../utils/refresh-token.js";

const REFRESH_TOKEN_LIFETIME_DAYS = 7;

// ==========================================
// SESSION USER INTERFACE
// ==========================================

export interface RefreshSessionUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  is_active: boolean;
  must_change_password: boolean;
}

export interface RefreshSession {
  sessionId: string;
  user: RefreshSessionUser;
}

// ==========================================
// CREATE SESSION
// ==========================================

export async function createSession(
  userId: string,
  refreshToken: string
): Promise<string> {
  const refreshTokenHash = hashRefreshToken(refreshToken);

  const result = await pool.query<{ id: string }>(
    `INSERT INTO sessions (
      user_id,
      refresh_token_hash,
      expires_at
    )
    VALUES (
      $1,
      $2,
      NOW() + ($3 * INTERVAL '1 day')
    )
    RETURNING id`,
    [
      userId,
      refreshTokenHash,
      REFRESH_TOKEN_LIFETIME_DAYS,
    ]
  );

  // Check whether PostgreSQL returned the created session.
  const session = result.rows[0];

  if (!session) {
    throw new Error("Failed to create database session.");
  }

  return session.id;
}

// ==========================================
// ROTATE REFRESH TOKEN
// ==========================================

export async function rotateRefreshToken(
  currentToken: string,
  newToken: string
): Promise<RefreshSession | null> {
  const currentHash = hashRefreshToken(currentToken);
  const newHash = hashRefreshToken(newToken);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Find and lock the existing valid session.
    const result = await client.query<
      RefreshSessionUser & { session_id: string }
    >(
      `SELECT
         s.id AS session_id,
         u.id,
         u.name,
         u.email,
         u.role,
         u.is_active,
         u.must_change_password
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()
         AND u.is_active = TRUE
       FOR UPDATE OF s`,
      [currentHash]
    );

    const existingSession = result.rows[0];

    if (!existingSession) {
      await client.query("ROLLBACK");
      return null;
    }

    // 2. Replace the old refresh-token hash.
    await client.query(
      `UPDATE sessions
       SET refresh_token_hash = $1,
           expires_at = NOW() + ($2 * INTERVAL '1 day'),
           last_used_at = NOW()
       WHERE id = $3`,
      [
        newHash,
        REFRESH_TOKEN_LIFETIME_DAYS,
        existingSession.session_id,
      ]
    );

    await client.query("COMMIT");

    // 3. Return the session ID and user information.
    const {
      session_id: sessionId,
      ...user
    } = existingSession;

    return {
      sessionId,
      user,
    };

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;

  } finally {
    client.release();
  }
}

// ==========================================
// REVOKE SESSION
// ==========================================

export async function revokeSession(
  refreshToken: string
): Promise<void> {
  const refreshTokenHash = hashRefreshToken(refreshToken);

  await pool.query(
    `UPDATE sessions
     SET revoked_at = NOW()
     WHERE refresh_token_hash = $1
       AND revoked_at IS NULL`,
    [refreshTokenHash]
  );
}


// ==========================================
// REVOKE OTHER USER SESSIONS
// ==========================================

export async function revokeOtherUserSessions(
  userId: string,
  currentSessionId: string
): Promise<void> {
  await pool.query(
    `UPDATE sessions
     SET revoked_at = NOW()
     WHERE user_id = $1
       AND id <> $2
       AND revoked_at IS NULL`,
    [userId, currentSessionId]
  );
}
