
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { pool } from "../config/database.js";

import type {
  CreateStaffInput,
  UpdateStaffInput,
} from "../validators/user.validator.js";

// ==========================================
// TYPES
// ==========================================

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: "STAFF";
  is_active: boolean;
  must_change_password: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface StaffListResult {
  staff: Staff[];
  total: number;
  page: number;
  limit: number;
}

// ==========================================
// GENERATE TEMPORARY PASSWORD
// ==========================================

function generateTemporaryPassword(): string {
  return `Staff@${randomBytes(12).toString("hex")}A1!`;
}

// ==========================================
// CREATE STAFF ACCOUNT
// ==========================================

export async function createStaff(
  input: CreateStaffInput
): Promise<{ staff: Staff; temporaryPassword: string } | null> {
  const existingUser = await pool.query(
    `SELECT id FROM users WHERE email = $1`,
    [input.email]
  );

  if (existingUser.rows.length > 0) {
    return null;
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const result = await pool.query<Staff>(
    `INSERT INTO users (
      name,
      email,
      password_hash,
      role,
      is_active,
      must_change_password,
      temporary_password_expires_at
    )
    VALUES (
      $1, $2, $3, 'STAFF', TRUE, TRUE,
      NOW() + INTERVAL '24 hours'
    )
    RETURNING
      id, name, email, role, is_active,
      must_change_password, created_at, updated_at`,
    [input.name, input.email, passwordHash]
  );

  const staff = result.rows[0];

  if (!staff) {
    throw new Error("Failed to create staff account.");
  }

  return { staff, temporaryPassword };
}

// ==========================================
// GET STAFF LIST
// ==========================================

export async function getStaffList(
  page: number,
  limit: number,
  search: string,
  sortBy: "created_at" | "name" | "email" = "created_at",
  sortOrder: "asc" | "desc" = "desc"
): Promise<StaffListResult> {
  const offset = (page - 1) * limit;
  const sortColumn = { created_at: "created_at", name: "name", email: "email" }[sortBy];
  const direction = sortOrder === "asc" ? "ASC" : "DESC";

  const result = await pool.query<Staff>(
    `SELECT
       id, name, email, role, is_active,
       must_change_password, created_at, updated_at
     FROM users
     WHERE role = 'STAFF'
       AND (
         name ILIKE $1
         OR email ILIKE $1
       )
     ORDER BY ${sortColumn} ${direction}, id ${direction}
     LIMIT $2 OFFSET $3`,
    [`%${search}%`, limit, offset]
  );

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE role = 'STAFF'
       AND (
         name ILIKE $1
         OR email ILIKE $1
       )`,
    [`%${search}%`]
  );

  return {
    staff: result.rows,
    total: Number(countResult.rows[0]?.total ?? 0),
    page,
    limit,
  };
}

// ==========================================
// GET STAFF BY ID
// ==========================================

export async function getStaffById(
  staffId: string
): Promise<Staff | null> {
  const result = await pool.query<Staff>(
    `SELECT
       id, name, email, role, is_active,
       must_change_password, created_at, updated_at
     FROM users
     WHERE id = $1
       AND role = 'STAFF'`,
    [staffId]
  );

  return result.rows[0] ?? null;
}

// ==========================================
// UPDATE STAFF DETAILS
// ==========================================

export async function updateStaff(
  staffId: string,
  input: UpdateStaffInput
): Promise<Staff | null> {
  const result = await pool.query<Staff>(
    `UPDATE users
     SET
       name = COALESCE($1, name),
       email = COALESCE($2, email),
       updated_at = NOW()
     WHERE id = $3
       AND role = 'STAFF'
     RETURNING
       id, name, email, role, is_active,
       must_change_password, created_at, updated_at`,
    [input.name ?? null, input.email ?? null, staffId]
  );

  return result.rows[0] ?? null;
}

// ==========================================
// UPDATE STAFF STATUS
// ==========================================

export async function updateStaffStatus(
  staffId: string,
  isActive: boolean
): Promise<Staff | null> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<Staff>(
      `UPDATE users
       SET is_active = $1,
           updated_at = NOW()
       WHERE id = $2
         AND role = 'STAFF'
       RETURNING
         id, name, email, role, is_active,
         must_change_password, created_at, updated_at`,
      [isActive, staffId]
    );

    const staff = result.rows[0];

    if (!staff) {
      await client.query("ROLLBACK");
      return null;
    }

    if (!isActive) {
      await client.query(
        `UPDATE sessions
         SET revoked_at = NOW()
         WHERE user_id = $1
           AND revoked_at IS NULL`,
        [staffId]
      );
    }

    await client.query("COMMIT");

    return staff;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// RESET STAFF PASSWORD
// ==========================================

export async function resetStaffPassword(
  staffId: string
): Promise<string | null> {
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE users
       SET password_hash = $1,
           must_change_password = TRUE,
           temporary_password_expires_at = NOW() + INTERVAL '24 hours',
           updated_at = NOW()
       WHERE id = $2
         AND role = 'STAFF'
       RETURNING id`,
      [passwordHash, staffId]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `UPDATE sessions
       SET revoked_at = NOW()
       WHERE user_id = $1
         AND revoked_at IS NULL`,
      [staffId]
    );

    await client.query("COMMIT");

    return temporaryPassword;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
