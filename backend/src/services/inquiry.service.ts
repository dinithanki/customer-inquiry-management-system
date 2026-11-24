
import { pool } from "../config/database.js";
import type { PoolClient } from "pg";
import type {
  CreateInquiryInput,
  UpdateInquiryStatusInput,
} from "../validators/inquiry.validator.js";

// ============================================
// TYPES
// ============================================

export type DuplicateInquiry = {
  id: string;
  customer_name: string;
  subject: string;
  status: string;
  created_at: Date;
};

export type CreatedInquiry = {
  id: string;
  customer_name: string;
  contact_method: string;
  contact: string;
  subject: string;
  description: string;
  status: string;
  created_by: string;
  created_at: Date;
};

export type InquiryFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: "NEW" | "IN_PROGRESS" | "RESOLVED";
  sortBy?: "created_at" | "customer_name";
  sortOrder?: "asc" | "desc";
};

export type InquiryListItem = {
  id: string;
  customer_name: string;
  contact_method: string;
  contact: string;
  subject: string;
  status: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
};

export type PaginatedInquiries = {
  data: InquiryListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type InquiryStatusHistoryItem = {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: Date;
  changed_by: string;
  changed_by_name: string;
};

export type InquiryDetails = {
  id: string;
  customer_name: string;
  contact_method: string;
  contact: string;
  subject: string;
  description: string;
  status: string;
  created_by: string;
  created_by_name: string;
  updated_by: string | null;
  updated_by_name: string | null;
  resolved_by: string | null;
  resolved_by_name: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
  history: InquiryStatusHistoryItem[];
};

export type UpdatedInquiryStatus = {
  id: string;
  status: string;
  version: number;
  updated_by: string;
  resolved_by: string | null;
  updated_at: Date;
};

export type DeletedInquiry = {
  id: string;
  is_deleted: boolean;
  deleted_by: string;
  deleted_at: Date;
};

// ============================================
// CONTACT NORMALIZATION
// ============================================

function normalizeContact(
  contact: string,
  contactMethod: CreateInquiryInput["contactMethod"]
): string {
  const trimmedContact = contact.trim().toLowerCase();

  if (
    contactMethod === "PHONE" ||
    contactMethod === "WHATSAPP"
  ) {
    return trimmedContact.replace(/[\s\-().+]/g, "");
  }

  return trimmedContact;
}

// ============================================
// FIND DUPLICATE INQUIRIES
// ============================================

export async function findDuplicateInquiries(
  contact: string,
  contactMethod: CreateInquiryInput["contactMethod"]
): Promise<DuplicateInquiry[]> {
  const normalizedContact = normalizeContact(
    contact,
    contactMethod
  );

  const result = await pool.query<DuplicateInquiry>(
    `SELECT
       id,
       customer_name,
       subject,
       status,
       created_at
     FROM inquiries
     WHERE normalized_contact = $1
       AND status IN ('NEW', 'IN_PROGRESS')
       AND is_deleted = FALSE
     ORDER BY created_at DESC`,
    [normalizedContact]
  );

  return result.rows;
}

// ============================================
// CREATE INQUIRY
// ============================================

export async function createInquiry(
  input: CreateInquiryInput,
  staffId: string
): Promise<CreatedInquiry> {
  const normalizedContact = normalizeContact(
    input.contact,
    input.contactMethod
  );

  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    // Serialize inquiry creation for the same normalized contact.
    // The transaction-level advisory lock is automatically released
    // when this transaction commits or rolls back.
    await client.query(
      `SELECT pg_advisory_xact_lock(
         hashtextextended($1, 0)
       )`,
      [normalizedContact]
    );

    // Check for duplicates after acquiring the lock.
    // A concurrent request using the same contact must wait until
    // the first transaction finishes.
    const duplicates = await client.query<DuplicateInquiry>(
      `SELECT
         id,
         customer_name,
         subject,
         status,
         created_at
       FROM inquiries
       WHERE normalized_contact = $1
         AND status IN ('NEW', 'IN_PROGRESS')
         AND is_deleted = FALSE
       FOR UPDATE`,
      [normalizedContact]
    );

    if (
      duplicates.rows.length > 0 &&
      !input.confirmDuplicate
    ) {
      const error = new Error("DUPLICATE_INQUIRY");

      Object.assign(error, {
        duplicates: duplicates.rows,
      });

      throw error;
    }

    const result = await client.query<CreatedInquiry>(
      `INSERT INTO inquiries (
         customer_name,
         contact_method,
         contact,
         normalized_contact,
         subject,
         description,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING
         id,
         customer_name,
         contact_method,
         contact,
         subject,
         description,
         status,
         created_by,
         created_at`,
      [
        input.customerName,
        input.contactMethod,
        input.contact,
        normalizedContact,
        input.subject,
        input.description,
        staffId,
      ]
    );

    const inquiry = result.rows[0];

    if (!inquiry) {
      throw new Error("Failed to create inquiry");
    }

    await client.query(
      `INSERT INTO inquiry_status_history (
         inquiry_id,
         changed_by,
         from_status,
         to_status
       )
       VALUES ($1, $2, NULL, 'NEW')`,
      [inquiry.id, staffId]
    );

    await client.query("COMMIT");

    return inquiry;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// GET INQUIRIES WITH SEARCH AND PAGINATION
// ============================================

export async function getInquiries(
  filters: InquiryFilters
): Promise<PaginatedInquiries> {
  const page = Math.max(
    1,
    Math.floor(filters.page ?? 1)
  );

  const limit = Math.min(
    100,
    Math.max(1, Math.floor(filters.limit ?? 10))
  );

  const offset = (page - 1) * limit;

  // Always exclude soft-deleted inquiries.
  const conditions: string[] = ["is_deleted = FALSE"];

  const values: (string | number)[] = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }

  if (filters.search?.trim()) {
    values.push(`%${filters.search.trim()}%`);

    const position = `$${values.length}`;

    conditions.push(
      `(customer_name ILIKE ${position}
        OR contact ILIKE ${position}
        OR subject ILIKE ${position})`
    );
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const sortColumn = {
    created_at: "created_at",
    customer_name: "customer_name",
  }[filters.sortBy ?? "created_at"];
  const sortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM inquiries
     ${whereClause}`,
    values
  );

  const total = Number(
    countResult.rows[0]?.total ?? 0
  );

  const dataResult = await pool.query<InquiryListItem>(
    `SELECT
       id,
       customer_name,
       contact_method,
       contact,
       subject,
       status,
       created_by,
       created_at,
       updated_at
     FROM inquiries
     ${whereClause}
     ORDER BY ${sortColumn} ${sortOrder}, id ${sortOrder}
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    [...values, limit, offset]
  );

  return {
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============================================
// GET SINGLE INQUIRY WITH STATUS HISTORY
// ============================================

export async function getInquiryById(
  inquiryId: string
): Promise<InquiryDetails | null> {
  const inquiryResult = await pool.query<InquiryDetails>(
    `SELECT
       i.id,
       i.customer_name,
       i.contact_method,
       i.contact,
       i.subject,
       i.description,
       i.status,
       i.created_by,
       creator.name AS created_by_name,
       i.updated_by,
       updater.name AS updated_by_name,
       i.resolved_by,
       resolver.name AS resolved_by_name,
       i.version,
       i.created_at,
       i.updated_at
     FROM inquiries i
     INNER JOIN users creator
       ON creator.id = i.created_by
     LEFT JOIN users updater
       ON updater.id = i.updated_by
     LEFT JOIN users resolver
       ON resolver.id = i.resolved_by
     WHERE i.id = $1
       AND i.is_deleted = FALSE`,
    [inquiryId]
  );

  const inquiry = inquiryResult.rows[0];

  if (!inquiry) {
    return null;
  }

  const historyResult =
    await pool.query<InquiryStatusHistoryItem>(
      `SELECT
         h.id,
         h.from_status,
         h.to_status,
         h.changed_at,
         h.changed_by,
         u.name AS changed_by_name
       FROM inquiry_status_history h
       INNER JOIN users u
         ON u.id = h.changed_by
       WHERE h.inquiry_id = $1
       ORDER BY h.changed_at ASC, h.id ASC`,
      [inquiryId]
    );

  return {
    ...inquiry,
    history: historyResult.rows,
  };
}

// ============================================
// VALIDATE STATUS TRANSITIONS
// ============================================

const allowedTransitions: Record<string, string[]> = {
  NEW: ["IN_PROGRESS", "RESOLVED"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["IN_PROGRESS"],
};

function isValidStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  return (
    allowedTransitions[currentStatus]?.includes(newStatus) ??
    false
  );
}

// ============================================
// UPDATE INQUIRY STATUS
// ============================================

export async function updateInquiryStatus(
  inquiryId: string,
  input: UpdateInquiryStatusInput,
  staffId: string
): Promise<UpdatedInquiryStatus> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock only an active inquiry.
    const currentResult = await client.query<{
      id: string;
      status: string;
      version: number;
    }>(
      `SELECT id, status, version
       FROM inquiries
       WHERE id = $1
         AND is_deleted = FALSE
       FOR UPDATE`,
      [inquiryId]
    );

    const currentInquiry = currentResult.rows[0];

    if (!currentInquiry) {
      throw new Error("INQUIRY_NOT_FOUND");
    }

    // Detect updates based on outdated data.
    if (currentInquiry.version !== input.version) {
      throw new Error("STALE_INQUIRY_VERSION");
    }

    // Prevent invalid status transitions.
    if (
      !isValidStatusTransition(
        currentInquiry.status,
        input.status
      )
    ) {
      throw new Error("INVALID_STATUS_TRANSITION");
    }

    const resolvedBy =
      input.status === "RESOLVED" ? staffId : null;

    // Update the inquiry and increment its version.
    const updateResult =
      await client.query<UpdatedInquiryStatus>(
        `UPDATE inquiries
         SET
           status = $1,
           updated_by = $2,
           resolved_by = $3,
           version = version + 1,
           updated_at = NOW()
         WHERE id = $4
           AND version = $5
           AND is_deleted = FALSE
         RETURNING
           id,
           status,
           version,
           updated_by,
           resolved_by,
           updated_at`,
        [
          input.status,
          staffId,
          resolvedBy,
          inquiryId,
          input.version,
        ]
      );

    const updatedInquiry = updateResult.rows[0];

    if (!updatedInquiry) {
      throw new Error("STALE_INQUIRY_VERSION");
    }

    // Record the status transition.
    await client.query(
      `INSERT INTO inquiry_status_history (
         inquiry_id,
         changed_by,
         from_status,
         to_status
       )
       VALUES ($1, $2, $3, $4)`,
      [
        inquiryId,
        staffId,
        currentInquiry.status,
        input.status,
      ]
    );

    await client.query("COMMIT");

    return updatedInquiry;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// SOFT DELETE INQUIRY
// ============================================

export async function deleteInquiry(
  inquiryId: string,
  adminId: string
): Promise<DeletedInquiry | null> {
  const result = await pool.query<DeletedInquiry>(
    `UPDATE inquiries
     SET
       is_deleted = TRUE,
       deleted_by = $1,
       deleted_at = NOW()
     WHERE id = $2
       AND is_deleted = FALSE
     RETURNING
       id,
       is_deleted,
       deleted_by,
       deleted_at`,
    [adminId, inquiryId]
  );

  // Returns null if the inquiry does not exist
  // or has already been deleted.
  return result.rows[0] ?? null;
}
