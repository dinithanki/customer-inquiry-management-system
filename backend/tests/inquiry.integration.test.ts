
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import request from "supertest";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";

import app from "../src/app.js";
import { pool } from "../src/config/database.js";

const TEST_PASSWORD = "InquiryStaffTest123!";
const TEST_ADMIN_PASSWORD = "InquiryAdminTest123!";

interface TestUser {
  id: string;
  email: string;
}

interface CreateInquiryInput {
  customerName: string;
  contactMethod: "PHONE" | "EMAIL" | "WHATSAPP";
  contact: string;
  subject: string;
  description: string;
  confirmDuplicate?: boolean;
}

type TestAgent = ReturnType<typeof request.agent>;

let adminAgent: TestAgent;
let staffAgent: TestAgent;

const createdUserIds: string[] = [];
const createdInquiryIds: string[] = [];

const uniqueId = randomUUID();

async function createTestUser(
  role: "ADMIN" | "STAFF",
  email: string,
  password: string
): Promise<TestUser> {
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query<TestUser>(
    `INSERT INTO users (
      name,
      email,
      password_hash,
      role,
      is_active,
      must_change_password
    )
    VALUES ($1, $2, $3, $4, TRUE, FALSE)
    RETURNING id, email`,
    [
      `Temporary Test ${role}`,
      email,
      passwordHash,
      role,
    ]
  );

  const user = result.rows[0];

  if (!user) {
    throw new Error(`Failed to create temporary ${role}.`);
  }

  createdUserIds.push(user.id);

  return user;
}

function makeInquiry(
  overrides: Partial<CreateInquiryInput> = {}
): CreateInquiryInput {
  const id = randomUUID();

  return {
    customerName: `Test Customer ${id.slice(0, 8)}`,
    contactMethod: "PHONE",
    contact: `077${id.replace(/\D/g, "").slice(0, 7)}`,
    subject: `Test Inquiry ${id}`,
    description: `This is an integration test inquiry description for ${id}.`,
    ...overrides,
  };
}

async function submitInquiry(
  agent: TestAgent,
  input: CreateInquiryInput = makeInquiry()
) {
  const response = await agent
    .post("/api/inquiries")
    .send(input);

  if (response.status === 201 && response.body.data?.id) {
    createdInquiryIds.push(response.body.data.id);
  }

  return response;
}

describe("Inquiry Management API Integration Tests", () => {
  beforeAll(async () => {
    // Ensure tests never use the production database.
    if (
      process.env.NODE_ENV !== "test" ||
      !process.env.DATABASE_URL_TEST
    ) {
      throw new Error(
        "Inquiry tests must use DATABASE_URL_TEST."
      );
    }

    // Verify the actual database before creating fixtures.
    const databaseResult = await pool.query<{
      database: string;
    }>("SELECT current_database() AS database");

    if (
      databaseResult.rows[0]?.database !== "customer_inquiry_db"
    ) {
      throw new Error(
        "Unexpected database. Inquiry test fixtures were not created."
      );
    }

    // Create a temporary ADMIN account.
    const admin = await createTestUser(
      "ADMIN",
      `inquiry-admin-${uniqueId}@example.com`,
      TEST_ADMIN_PASSWORD
    );

    adminAgent = request.agent(app);

    const adminLogin = await adminAgent
      .post("/api/auth/login")
      .send({
        email: admin.email,
        password: TEST_ADMIN_PASSWORD,
      });

    if (adminLogin.status !== 200) {
      throw new Error(
        `Inquiry test ADMIN login failed: ${adminLogin.status}`
      );
    }

    expect(adminLogin.body.data.user.role).toBe("ADMIN");

    // Create a temporary STAFF account.
    const staff = await createTestUser(
      "STAFF",
      `inquiry-staff-${uniqueId}@example.com`,
      TEST_PASSWORD
    );

    staffAgent = request.agent(app);

    const staffLogin = await staffAgent
      .post("/api/auth/login")
      .send({
        email: staff.email,
        password: TEST_PASSWORD,
      });

    if (staffLogin.status !== 200) {
      throw new Error(
        `Inquiry test STAFF login failed: ${staffLogin.status}`
      );
    }

    expect(staffLogin.body.data.user.role).toBe("STAFF");
  });

  afterAll(async () => {
    // Delete only inquiries created by this test suite.
    // Status history is removed through ON DELETE CASCADE.
    if (createdInquiryIds.length > 0) {
      await pool.query(
        `DELETE FROM inquiries
         WHERE id = ANY($1::uuid[])`,
        [createdInquiryIds]
      );
    }

    // Delete sessions belonging to temporary test users.
    if (createdUserIds.length > 0) {
      await pool.query(
        `DELETE FROM sessions
         WHERE user_id = ANY($1::uuid[])`,
        [createdUserIds]
      );

      // Delete only temporary test accounts.
      await pool.query(
        `DELETE FROM users
         WHERE id = ANY($1::uuid[])`,
        [createdUserIds]
      );
    }
  });

  // ==========================================
  // AUTHORIZATION
  // ==========================================

  it("should reject unauthenticated inquiry access", async () => {
    const response = await request(app)
      .get("/api/inquiries");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("should allow STAFF to access inquiries", async () => {
    const response = await staffAgent
      .get("/api/inquiries");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should allow ADMIN to access inquiries", async () => {
    const response = await adminAgent
      .get("/api/inquiries");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  // ==========================================
  // CREATE INQUIRY
  // ==========================================

  it("should allow STAFF to create an inquiry", async () => {
    const input = makeInquiry();

    const response = await submitInquiry(staffAgent, input);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    expect(response.body.data).toMatchObject({
      customer_name: input.customerName,
      contact_method: input.contactMethod,
      contact: input.contact,
      subject: input.subject,
      description: input.description,
      status: "NEW",
    });

    expect(response.body.data.id).toBeTruthy();
    expect(response.body.data.created_by).toBeTruthy();
  });

  it("should allow ADMIN to create an inquiry", async () => {
    const input = makeInquiry();

    const response = await submitInquiry(adminAgent, input);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("NEW");
  });

  it("should reject invalid inquiry information", async () => {
    const response = await staffAgent
      .post("/api/inquiries")
      .send({
        customerName: "A",
        contactMethod: "INVALID",
        contact: "",
        subject: "AB",
        description: "Short",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("should reject a missing inquiry request body", async () => {
    const response = await staffAgent
      .post("/api/inquiries")
      .send({});

    expect(response.status).toBe(400);
  });

  // ==========================================
  // DUPLICATE INQUIRY DETECTION
  // ==========================================

  it("should detect an existing active inquiry with the same contact", async () => {
    const contact = `077${randomUUID()
      .replace(/\D/g, "")
      .slice(0, 7)}`;

    const firstInquiry = await submitInquiry(
      staffAgent,
      makeInquiry({ contact })
    );

    expect(firstInquiry.status).toBe(201);

    const response = await staffAgent
      .post("/api/inquiries/check-duplicates")
      .send({
        contact,
        contactMethod: "PHONE",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.hasDuplicates).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it("should reject duplicate inquiry creation without confirmation", async () => {
    const contact = `077${randomUUID()
      .replace(/\D/g, "")
      .slice(0, 7)}`;

    const firstInquiry = await submitInquiry(
      staffAgent,
      makeInquiry({ contact })
    );

    expect(firstInquiry.status).toBe(201);

    const response = await staffAgent
      .post("/api/inquiries")
      .send(makeInquiry({ contact }));

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe("DUPLICATE_INQUIRY");
    expect(response.body.duplicates.length).toBeGreaterThan(0);
  });

  it("should allow duplicate creation after explicit confirmation", async () => {
    const contact = `077${randomUUID()
      .replace(/\D/g, "")
      .slice(0, 7)}`;

    const firstInquiry = await submitInquiry(
      staffAgent,
      makeInquiry({ contact })
    );

    expect(firstInquiry.status).toBe(201);

    const response = await submitInquiry(
      staffAgent,
      makeInquiry({
        contact,
        confirmDuplicate: true,
      })
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it("should reject invalid duplicate-check information", async () => {
    const response = await staffAgent
      .post("/api/inquiries/check-duplicates")
      .send({
        contact: "A",
        contactMethod: "INVALID",
      });

    expect(response.status).toBe(400);
  });

  // ==========================================
  // LIST, SEARCH AND PAGINATION
  // ==========================================

  it("should return inquiries with pagination", async () => {
    await submitInquiry(staffAgent);

    const response = await staffAgent
      .get("/api/inquiries")
      .query({
        page: 1,
        limit: 10,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body).toHaveProperty("data");
    expect(response.body).toHaveProperty("pagination");

    expect(response.body.pagination).toMatchObject({
      page: 1,
      limit: 10,
    });

    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("should support searching inquiries by subject", async () => {
    const input = makeInquiry();

    const created = await submitInquiry(staffAgent, input);

    expect(created.status).toBe(201);

    const response = await staffAgent
      .get("/api/inquiries")
      .query({
        search: input.subject,
      });

    expect(response.status).toBe(200);

    expect(
      response.body.data.some(
        (inquiry: { id: string }) =>
          inquiry.id === created.body.data.id
      )
    ).toBe(true);
  });

  it("should filter inquiries by status", async () => {
    const created = await submitInquiry(staffAgent);

    expect(created.status).toBe(201);

    const response = await staffAgent
      .get("/api/inquiries")
      .query({
        status: "NEW",
      });

    expect(response.status).toBe(200);

    expect(
      response.body.data.every(
        (inquiry: { status: string }) =>
          inquiry.status === "NEW"
      )
    ).toBe(true);
  });

  it("should reject invalid pagination and filter parameters", async () => {
    const response = await staffAgent
      .get("/api/inquiries")
      .query({
        page: 0,
        limit: 101,
        status: "INVALID",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // GET INQUIRY DETAILS
  // ==========================================

  it("should retrieve inquiry details and status history", async () => {
    const created = await submitInquiry(staffAgent);

    expect(created.status).toBe(201);

    const inquiryId = created.body.data.id;

    const response = await staffAgent
      .get(`/api/inquiries/${inquiryId}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data).toMatchObject({
      id: inquiryId,
      status: "NEW",
    });

    expect(response.body.data.created_by_name).toBeTruthy();
    expect(Array.isArray(response.body.data.history)).toBe(true);
    expect(response.body.data.history.length).toBe(1);

    expect(response.body.data.history[0]).toMatchObject({
      from_status: null,
      to_status: "NEW",
    });
  });

  it("should reject an invalid inquiry ID", async () => {
    const response = await staffAgent
      .get("/api/inquiries/invalid-id");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid inquiry ID");
  });

  it("should return 404 for a missing inquiry", async () => {
    const response = await staffAgent
      .get(`/api/inquiries/${randomUUID()}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Inquiry not found");
  });

  // ==========================================
  // UPDATE INQUIRY STATUS
  // ==========================================

  it("should support valid status transitions and reopening", async () => {
    const created = await submitInquiry(staffAgent);

    expect(created.status).toBe(201);

    const inquiryId = created.body.data.id;

    // NEW -> IN_PROGRESS
    const inProgress = await staffAgent
      .patch(`/api/inquiries/${inquiryId}/status`)
      .send({
        status: "IN_PROGRESS",
        version: 1,
      });

    expect(inProgress.status).toBe(200);
    expect(inProgress.body.data.status).toBe("IN_PROGRESS");
    expect(inProgress.body.data.version).toBe(2);

    // IN_PROGRESS -> RESOLVED
    const resolved = await staffAgent
      .patch(`/api/inquiries/${inquiryId}/status`)
      .send({
        status: "RESOLVED",
        version: 2,
      });

    expect(resolved.status).toBe(200);
    expect(resolved.body.data.status).toBe("RESOLVED");
    expect(resolved.body.data.version).toBe(3);
    expect(resolved.body.data.resolved_by).toBeTruthy();

    // RESOLVED -> IN_PROGRESS (reopening)
    const reopened = await staffAgent
      .patch(`/api/inquiries/${inquiryId}/status`)
      .send({
        status: "IN_PROGRESS",
        version: 3,
      });

    expect(reopened.status).toBe(200);
    expect(reopened.body.data.status).toBe("IN_PROGRESS");
    expect(reopened.body.data.version).toBe(4);
    expect(reopened.body.data.resolved_by).toBeNull();

    // Verify status history.
    const details = await staffAgent
      .get(`/api/inquiries/${inquiryId}`);

    expect(details.status).toBe(200);
    expect(details.body.data.history).toHaveLength(4);

    expect(
      details.body.data.history.map(
        (item: { to_status: string }) => item.to_status
      )
    ).toEqual([
      "NEW",
      "IN_PROGRESS",
      "RESOLVED",
      "IN_PROGRESS",
    ]);
  });

  it("should reject an invalid status transition", async () => {
    const created = await submitInquiry(staffAgent);

    expect(created.status).toBe(201);

    const inquiryId = created.body.data.id;

    // First move NEW -> IN_PROGRESS.
    const firstUpdate = await staffAgent
      .patch(`/api/inquiries/${inquiryId}/status`)
      .send({
        status: "IN_PROGRESS",
        version: 1,
      });

    expect(firstUpdate.status).toBe(200);

    // IN_PROGRESS -> NEW is not allowed.
    const response = await staffAgent
      .patch(`/api/inquiries/${inquiryId}/status`)
      .send({
        status: "NEW",
        version: 2,
      });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("should reject a stale inquiry version", async () => {
    const created = await submitInquiry(staffAgent);

    expect(created.status).toBe(201);

    const inquiryId = created.body.data.id;

    // Update version 1 to version 2.
    const firstUpdate = await staffAgent
      .patch(`/api/inquiries/${inquiryId}/status`)
      .send({
        status: "IN_PROGRESS",
        version: 1,
      });

    expect(firstUpdate.status).toBe(200);

    // Attempt another update using outdated version 1.
    const staleUpdate = await staffAgent
      .patch(`/api/inquiries/${inquiryId}/status`)
      .send({
        status: "RESOLVED",
        version: 1,
      });

    expect(staleUpdate.status).toBe(409);
    expect(staleUpdate.body.code).toBe("STALE_INQUIRY_VERSION");
  });

  it("should reject invalid status update information", async () => {
    const created = await submitInquiry(staffAgent);

    expect(created.status).toBe(201);

    const response = await staffAgent
      .patch(`/api/inquiries/${created.body.data.id}/status`)
      .send({
        status: "INVALID",
        version: 1,
      });

    expect(response.status).toBe(400);
  });

  it("should return 404 when updating a missing inquiry", async () => {
    const response = await staffAgent
      .patch(`/api/inquiries/${randomUUID()}/status`)
      .send({
        status: "IN_PROGRESS",
        version: 1,
      });

    expect(response.status).toBe(404);
  });

  // ==========================================
  // SOFT DELETE INQUIRY
  // ==========================================

  it("should prevent STAFF from deleting an inquiry", async () => {
    const created = await submitInquiry(staffAgent);

    expect(created.status).toBe(201);

    const response = await staffAgent
      .delete(`/api/inquiries/${created.body.data.id}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);

    // The inquiry should still exist.
    const details = await staffAgent
      .get(`/api/inquiries/${created.body.data.id}`);

    expect(details.status).toBe(200);
  });

  it("should allow ADMIN to soft-delete an inquiry", async () => {
    const created = await submitInquiry(staffAgent);

    expect(created.status).toBe(201);

    const inquiryId = created.body.data.id;

    const response = await adminAgent
      .delete(`/api/inquiries/${inquiryId}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data).toMatchObject({
      id: inquiryId,
      is_deleted: true,
    });

    expect(response.body.data.deleted_by).toBeTruthy();
    expect(response.body.data.deleted_at).toBeTruthy();

    // Soft-deleted inquiry must no longer be accessible.
    const details = await staffAgent
      .get(`/api/inquiries/${inquiryId}`);

    expect(details.status).toBe(404);
  });

  it("should return 404 when retrieving an already deleted inquiry", async () => {
    const created = await submitInquiry(staffAgent);

    expect(created.status).toBe(201);

    const inquiryId = created.body.data.id;

    const deletion = await adminAgent
      .delete(`/api/inquiries/${inquiryId}`);

    expect(deletion.status).toBe(200);

    const secondDeletion = await adminAgent
      .delete(`/api/inquiries/${inquiryId}`);

    expect(secondDeletion.status).toBe(404);
  });

  it("should reject invalid inquiry IDs during deletion", async () => {
    const response = await adminAgent
      .delete("/api/inquiries/invalid-id");

    expect(response.status).toBe(400);
  });
});
