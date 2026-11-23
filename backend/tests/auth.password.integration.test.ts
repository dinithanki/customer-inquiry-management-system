
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";

import app from "../src/app.js";
import { pool } from "../src/config/database.js";

const INITIAL_PASSWORD = "InitialPassword123!";
const NEW_PASSWORD = "UpdatedPassword456!";

let testUserId: string;
let testUserEmail: string;

async function createTestUser(): Promise<void> {
  testUserEmail = `password-test-${randomUUID()}@example.com`;

  const passwordHash = await bcrypt.hash(INITIAL_PASSWORD, 10);

  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (
      name,
      email,
      password_hash,
      role,
      is_active,
      must_change_password
    )
    VALUES ($1, $2, $3, 'STAFF', TRUE, FALSE)
    RETURNING id`,
    ["Password Test User", testUserEmail, passwordHash]
  );

  const user = result.rows[0];

  if (!user) {
    throw new Error("Failed to create password test user.");
  }

  testUserId = user.id;
}

async function loginUser() {
  const agent = request.agent(app);

  const response = await agent
    .post("/api/auth/login")
    .send({
      email: testUserEmail,
      password: INITIAL_PASSWORD,
    });

  if (response.status !== 200) {
    throw new Error("Failed to log in password test user.");
  }

  return agent;
}

describe("Password Change API Integration Tests", () => {
  beforeEach(async () => {
    if (
      process.env.NODE_ENV !== "test" ||
      !process.env.DATABASE_URL_TEST
    ) {
      throw new Error(
        "Password tests must use DATABASE_URL_TEST."
      );
    }

    await createTestUser();
  });

  afterEach(async () => {
    if (testUserId) {
      await pool.query(
        "DELETE FROM sessions WHERE user_id = $1",
        [testUserId]
      );

      await pool.query(
        "DELETE FROM users WHERE id = $1",
        [testUserId]
      );

      testUserId = "";
    }
  });

  it("should successfully change the user's password", async () => {
    const agent = await loginUser();

    const response = await agent
      .post("/api/auth/change-password")
      .send({
        currentPassword: INITIAL_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Password changed successfully"
    );

    const userResult = await pool.query<{
      password_hash: string;
      must_change_password: boolean;
      temporary_password_expires_at: Date | null;
    }>(
      `SELECT
        password_hash,
        must_change_password,
        temporary_password_expires_at
       FROM users
       WHERE id = $1`,
      [testUserId]
    );

    const user = userResult.rows[0];

    expect(user).toBeDefined();
    expect(user?.password_hash).not.toBe(INITIAL_PASSWORD);
    expect(
      await bcrypt.compare(NEW_PASSWORD, user!.password_hash)
    ).toBe(true);
    expect(user?.must_change_password).toBe(false);
    expect(user?.temporary_password_expires_at).toBeNull();

    const oldPasswordLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUserEmail,
        password: INITIAL_PASSWORD,
      });

    expect(oldPasswordLogin.status).toBe(401);

    const newPasswordLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUserEmail,
        password: NEW_PASSWORD,
      });

    expect(newPasswordLogin.status).toBe(200);
  });

  it("should reject an incorrect current password", async () => {
    const agent = await loginUser();

    const response = await agent
      .post("/api/auth/change-password")
      .send({
        currentPassword: "WrongCurrentPassword123!",
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Current password is incorrect"
    );
  });

  it("should reject mismatched password confirmation", async () => {
    const agent = await loginUser();

    const response = await agent
      .post("/api/auth/change-password")
      .send({
        currentPassword: INITIAL_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: "DifferentPassword789!",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Invalid password details"
    );
  });

  it("should reject a password shorter than eight characters", async () => {
    const agent = await loginUser();

    const response = await agent
      .post("/api/auth/change-password")
      .send({
        currentPassword: INITIAL_PASSWORD,
        newPassword: "Short1!",
        confirmPassword: "Short1!",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Invalid password details"
    );
  });

  it("should reject changing to the same password", async () => {
    const agent = await loginUser();

    const response = await agent
      .post("/api/auth/change-password")
      .send({
        currentPassword: INITIAL_PASSWORD,
        newPassword: INITIAL_PASSWORD,
        confirmPassword: INITIAL_PASSWORD,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Invalid password details"
    );
  });

  it("should revoke other sessions but keep the current session active", async () => {
    const firstAgent = await loginUser();
    const secondAgent = await loginUser();

    const sessionsBefore = await pool.query<{ id: string }>(
      "SELECT id FROM sessions WHERE user_id = $1",
      [testUserId]
    );

    expect(sessionsBefore.rows).toHaveLength(2);

    const changeResponse = await firstAgent
      .post("/api/auth/change-password")
      .send({
        currentPassword: INITIAL_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      });

    expect(changeResponse.status).toBe(200);

    const currentSessionResponse = await firstAgent
      .get("/api/auth/me");

    expect(currentSessionResponse.status).toBe(200);

    const otherSessionResponse = await secondAgent
      .get("/api/auth/me");

    expect(otherSessionResponse.status).toBe(401);

    const sessionResult = await pool.query<{
      revoked_at: Date | null;
    }>(
      `SELECT revoked_at
       FROM sessions
       WHERE user_id = $1`,
      [testUserId]
    );

    expect(sessionResult.rows).toHaveLength(2);

    const activeSessions = sessionResult.rows.filter(
      (session) => session.revoked_at === null
    );

    const revokedSessions = sessionResult.rows.filter(
      (session) => session.revoked_at !== null
    );

    expect(activeSessions).toHaveLength(1);
    expect(revokedSessions).toHaveLength(1);
  });

  it("should reject password changes without authentication", async () => {
    const response = await request(app)
      .post("/api/auth/change-password")
      .send({
        currentPassword: INITIAL_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
