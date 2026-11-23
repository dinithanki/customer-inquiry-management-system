
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

const TEST_PASSWORD = "StaffManagementTest123!";
const TEST_ADMIN_PASSWORD = "TemporaryAdminTest123!";

interface TestUser {
  id: string;
  email: string;
}

let adminAgent: ReturnType<typeof request.agent>;
let staffAgent: ReturnType<typeof request.agent>;

let fixtureStaff: TestUser;

const createdUserIds: string[] = [];
const uniqueId = randomUUID();

async function createTestAdmin(): Promise<TestUser> {
  const email = `test-admin-${uniqueId}@example.com`;
  const passwordHash = await bcrypt.hash(
    TEST_ADMIN_PASSWORD,
    10
  );

  const result = await pool.query<TestUser>(
    `INSERT INTO users (
      name,
      email,
      password_hash,
      role,
      is_active,
      must_change_password
    )
    VALUES ($1, $2, $3, 'ADMIN', TRUE, FALSE)
    RETURNING id, email`,
    ["Temporary Test Administrator", email, passwordHash]
  );

  const admin = result.rows[0];

  if (!admin) {
    throw new Error("Failed to create temporary test admin.");
  }

  createdUserIds.push(admin.id);

  return admin;
}

async function createTestStaff(): Promise<TestUser> {
  const email = `staff-management-${uniqueId}@example.com`;
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const result = await pool.query<TestUser>(
    `INSERT INTO users (
      name,
      email,
      password_hash,
      role,
      is_active,
      must_change_password
    )
    VALUES ($1, $2, $3, 'STAFF', TRUE, FALSE)
    RETURNING id, email`,
    ["Staff Management Test User", email, passwordHash]
  );

  const staff = result.rows[0];

  if (!staff) {
    throw new Error("Failed to create test staff.");
  }

  createdUserIds.push(staff.id);

  return staff;
}

describe("Staff Management API Integration Tests", () => {
  beforeAll(async () => {
    // Safety check: tests must never use production configuration.
    if (
      process.env.NODE_ENV !== "test" ||
      !process.env.DATABASE_URL_TEST
    ) {
      throw new Error(
        "Staff management tests must use DATABASE_URL_TEST."
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
        "Unexpected database. Test fixtures were not created."
      );
    }

    // Create a temporary ADMIN exclusively for this test suite.
    const testAdmin = await createTestAdmin();

    adminAgent = request.agent(app);

    const adminLogin = await adminAgent
      .post("/api/auth/login")
      .send({
        email: testAdmin.email,
        password: TEST_ADMIN_PASSWORD,
      });

    if (adminLogin.status !== 200) {
      throw new Error(
        `Test admin login failed: ${adminLogin.status}`
      );
    }

    expect(adminLogin.body.data.user.role).toBe("ADMIN");

    // Create a temporary STAFF account.
    fixtureStaff = await createTestStaff();

    staffAgent = request.agent(app);

    const staffLogin = await staffAgent
      .post("/api/auth/login")
      .send({
        email: fixtureStaff.email,
        password: TEST_PASSWORD,
      });

    if (staffLogin.status !== 200) {
      throw new Error(
        `Test staff login failed: ${staffLogin.status}`
      );
    }
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      // Delete sessions first.
      await pool.query(
        `DELETE FROM sessions
         WHERE user_id = ANY($1::uuid[])`,
        [createdUserIds]
      );

      // Delete only the temporary test accounts.
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

  it("should reject unauthenticated access", async () => {
    const response = await request(app)
      .get("/api/users");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("should reject STAFF access to admin-only endpoints", async () => {
    const response = await staffAgent
      .get("/api/users");

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  // ==========================================
  // GET STAFF LIST
  // ==========================================

  it("should allow ADMIN to retrieve the staff list", async () => {
    const response = await adminAgent
      .get("/api/users");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data).toHaveProperty("staff");
    expect(response.body.data).toHaveProperty("total");
    expect(response.body.data).toHaveProperty("page");
    expect(response.body.data).toHaveProperty("limit");

    expect(
      response.body.data.staff.every(
        (staff: { role: string }) => staff.role === "STAFF"
      )
    ).toBe(true);
  });

  it("should support staff search", async () => {
    const response = await adminAgent
      .get("/api/users")
      .query({
        search: `staff-management-${uniqueId}`,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(1);

    expect(response.body.data.staff[0].id).toBe(
      fixtureStaff.id
    );
  });

  it("should reject invalid pagination parameters", async () => {
    const response = await adminAgent
      .get("/api/users")
      .query({
        page: 0,
        limit: 10,
      });

    expect(response.status).toBe(400);
  });

  // ==========================================
  // GET STAFF DETAILS
  // ==========================================

  it("should retrieve staff details by ID", async () => {
    const response = await adminAgent
      .get(`/api/users/${fixtureStaff.id}`);

    expect(response.status).toBe(200);

    expect(response.body.data.staff).toMatchObject({
      id: fixtureStaff.id,
      email: fixtureStaff.email,
      role: "STAFF",
      is_active: true,
    });

    expect(
      response.body.data.staff.password_hash
    ).toBeUndefined();
  });

  it("should reject an invalid staff ID", async () => {
    const response = await adminAgent
      .get("/api/users/invalid-id");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid staff ID");
  });

  it("should return 404 for a missing staff account", async () => {
    const response = await adminAgent
      .get(`/api/users/${randomUUID()}`);

    expect(response.status).toBe(404);
  });

  // ==========================================
  // CREATE STAFF
  // ==========================================

  it("should allow ADMIN to create a staff account", async () => {
    const email = `new-staff-${uniqueId}@example.com`;

    const response = await adminAgent
      .post("/api/users")
      .send({
        name: "New Integration Test Staff",
        email,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    expect(response.body.data.staff).toMatchObject({
      name: "New Integration Test Staff",
      email,
      role: "STAFF",
      is_active: true,
      must_change_password: true,
    });

    expect(response.body.data.temporaryPassword).toBeTruthy();

    createdUserIds.push(response.body.data.staff.id);
  });

  it("should reject duplicate staff email addresses", async () => {
    const response = await adminAgent
      .post("/api/users")
      .send({
        name: "Duplicate Test User",
        email: fixtureStaff.email,
      });

    expect(response.status).toBe(409);
  });

  it("should reject invalid staff information", async () => {
    const response = await adminAgent
      .post("/api/users")
      .send({
        name: "A",
        email: "invalid-email",
      });

    expect(response.status).toBe(400);
  });

  // ==========================================
  // UPDATE STAFF
  // ==========================================

  it("should allow ADMIN to update staff details", async () => {
    const updatedEmail = `updated-${uniqueId}@example.com`;

    const response = await adminAgent
      .patch(`/api/users/${fixtureStaff.id}`)
      .send({
        name: "Updated Staff Member",
        email: updatedEmail,
      });

    expect(response.status).toBe(200);

    expect(response.body.data.staff).toMatchObject({
      id: fixtureStaff.id,
      name: "Updated Staff Member",
      email: updatedEmail,
      role: "STAFF",
    });

    // Keep the local test fixture synchronized with the database.
    fixtureStaff.email = updatedEmail;
  });

  it("should reject an empty staff update", async () => {
    const response = await adminAgent
      .patch(`/api/users/${fixtureStaff.id}`)
      .send({});

    expect(response.status).toBe(400);
  });

  // ==========================================
  // ACTIVATE / DEACTIVATE STAFF
  // ==========================================

  it("should deactivate and reactivate a staff account", async () => {
    const deactivateResponse = await adminAgent
      .patch(`/api/users/${fixtureStaff.id}/status`)
      .send({
        isActive: false,
      });

    expect(deactivateResponse.status).toBe(200);
    expect(deactivateResponse.body.data.staff.is_active).toBe(false);

    // The existing STAFF session must be revoked.
    const oldSessionResponse = await staffAgent
      .get("/api/auth/me");

    expect(oldSessionResponse.status).toBe(401);

    const activateResponse = await adminAgent
      .patch(`/api/users/${fixtureStaff.id}/status`)
      .send({
        isActive: true,
      });

    expect(activateResponse.status).toBe(200);
    expect(activateResponse.body.data.staff.is_active).toBe(true);
  });

  // ==========================================
  // RESET STAFF PASSWORD
  // ==========================================

  it("should reset a staff password and revoke existing sessions", async () => {
    const oldAgent = request.agent(app);

    const loginResponse = await oldAgent
      .post("/api/auth/login")
      .send({
        email: fixtureStaff.email,
        password: TEST_PASSWORD,
      });

    expect(loginResponse.status).toBe(200);

    const resetResponse = await adminAgent
      .post(`/api/users/${fixtureStaff.id}/reset-password`);

    expect(resetResponse.status).toBe(200);

    expect(resetResponse.body.data).toMatchObject({
      expiresIn: "24 hours",
      mustChangePassword: true,
    });

    const temporaryPassword =
      resetResponse.body.data.temporaryPassword;

    expect(temporaryPassword).toBeTruthy();

    // Previous session must no longer work.
    const oldSessionResponse = await oldAgent
      .get("/api/auth/me");

    expect(oldSessionResponse.status).toBe(401);

    // Temporary password should allow login.
    const temporaryAgent = request.agent(app);

    const temporaryLogin = await temporaryAgent
      .post("/api/auth/login")
      .send({
        email: fixtureStaff.email,
        password: temporaryPassword,
      });

    expect(temporaryLogin.status).toBe(200);
    expect(
      temporaryLogin.body.data.user.must_change_password
    ).toBe(true);

    // Staff must change the temporary password before using protected routes.
    const restrictedResponse = await temporaryAgent
      .get("/api/users");

    expect(restrictedResponse.status).toBe(403);
  });

  it("should reject an invalid staff ID during password reset", async () => {
    const response = await adminAgent
      .post("/api/users/invalid-id/reset-password");

    expect(response.status).toBe(400);
  });

  it("should return 404 when resetting a missing staff account", async () => {
    const response = await adminAgent
      .post(`/api/users/${randomUUID()}/reset-password`);

    expect(response.status).toBe(404);
  });
});
