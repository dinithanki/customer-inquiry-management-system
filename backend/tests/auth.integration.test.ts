
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";

import app from "../src/app.js";
import { pool } from "../src/config/database.js";

const TEST_PASSWORD = "TestPassword123!";

interface TestUser {
  id: string;
  email: string;
}

let activeUser: TestUser;
let inactiveUser: TestUser;
let validTemporaryUser: TestUser;
let expiredTemporaryUser: TestUser;

const createdUserIds: string[] = [];

async function createTestUser(
  email: string,
  isActive: boolean,
  mustChangePassword = false,
  temporaryPasswordExpiresAt: Date | null = null
): Promise<TestUser> {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const result = await pool.query<{ id: string; email: string }>(
    `INSERT INTO users (
      name,
      email,
      password_hash,
      role,
      is_active,
      must_change_password,
      temporary_password_expires_at
    )
    VALUES ($1, $2, $3, 'STAFF', $4, $5, $6)
    RETURNING id, email`,
    [
      "Authentication Test User",
      email,
      passwordHash,
      isActive,
      mustChangePassword,
      temporaryPasswordExpiresAt,
    ]
  );

  const user = result.rows[0];

  if (!user) {
    throw new Error("Failed to create authentication test user.");
  }

  createdUserIds.push(user.id);

  return user;
}

describe("Authentication API Integration Tests", () => {
  beforeAll(async () => {
    if (process.env.NODE_ENV !== "test" || !process.env.DATABASE_URL_TEST) {
      throw new Error(
        "Authentication integration tests must use DATABASE_URL_TEST."
      );
    }

    const uniqueId = randomUUID();

    activeUser = await createTestUser(
      `auth-active-${uniqueId}@example.com`,
      true
    );

    inactiveUser = await createTestUser(
      `auth-inactive-${uniqueId}@example.com`,
      false
    );

    validTemporaryUser = await createTestUser(
      `auth-temp-valid-${uniqueId}@example.com`,
      true,
      true,
      new Date(Date.now() + 60 * 60 * 1000)
    );

    expiredTemporaryUser = await createTestUser(
      `auth-temp-expired-${uniqueId}@example.com`,
      true,
      true,
      new Date(Date.now() - 60 * 60 * 1000)
    );
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await pool.query(
        "DELETE FROM users WHERE id = ANY($1::uuid[])",
        [createdUserIds]
      );
    }
  });

  it("should log in an active user with valid permanent credentials", async () => {
    const agent = request.agent(app);
    const response = await agent
      .post("/api/auth/login")
      .send({
        email: activeUser.email,
        password: TEST_PASSWORD,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Login successful");

    expect(response.body.data.user).toMatchObject({
      id: activeUser.id,
      email: activeUser.email,
      role: "STAFF",
      is_active: true,
    });

    expect(response.body.data.user.password_hash).toBeUndefined();

    const cookies = response.headers["set-cookie"] ?? [];

    expect(
      cookies.some((cookie) => cookie.startsWith("accessToken="))
    ).toBe(true);

    expect(
      cookies.some((cookie) => cookie.startsWith("refreshToken="))
    ).toBe(true);

    expect(
      cookies.every((cookie) => cookie.toLowerCase().includes("httponly"))
    ).toBe(true);

    const currentUserResponse = await agent.get("/api/auth/me");

    expect(currentUserResponse.status).toBe(200);
    expect(currentUserResponse.body.data.user).toMatchObject({
      id: activeUser.id,
      name: "Authentication Test User",
      email: activeUser.email,
      role: "STAFF",
    });
  });

  it("should allow login with a valid temporary password before expiry", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: validTemporaryUser.email,
        password: TEST_PASSWORD,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.data.user).toMatchObject({
      id: validTemporaryUser.id,
      email: validTemporaryUser.email,
      must_change_password: true,
    });
  });

  it("should reject login with an expired temporary password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: expiredTemporaryUser.email,
        password: TEST_PASSWORD,
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid email or password");
  });

  it("should reject login with an incorrect password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: activeUser.email,
        password: "WrongPassword123!",
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid email or password");
  });

  it("should reject login with an invalid email address", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "not-an-email",
        password: TEST_PASSWORD,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid login details");
  });

  it("should reject login without a password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: activeUser.email,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid login details");
  });

  it("should reject login for an inactive user", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: inactiveUser.email,
        password: TEST_PASSWORD,
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid email or password");
  });
});
