
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
import { hashRefreshToken } from "../src/utils/refresh-token.js";

const TEST_PASSWORD = "SessionTestPassword123!";

let testUserId: string;
let testUserEmail: string;

describe("Authentication Session Integration Tests", () => {
  beforeAll(async () => {
    if (
      process.env.NODE_ENV !== "test" ||
      !process.env.DATABASE_URL_TEST
    ) {
      throw new Error(
        "Session tests must use DATABASE_URL_TEST."
      );
    }

    testUserEmail = `session-test-${randomUUID()}@example.com`;

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

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
      ["Session Test User", testUserEmail, passwordHash]
    );

    const user = result.rows[0];

    if (!user) {
      throw new Error("Failed to create session test user.");
    }

    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await pool.query(
        "DELETE FROM sessions WHERE user_id = $1",
        [testUserId]
      );

      await pool.query(
        "DELETE FROM users WHERE id = $1",
        [testUserId]
      );
    }
  });

  it("should reject refresh when the refresh token is missing", async () => {
    const response = await request(app)
      .post("/api/auth/refresh");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Refresh token is missing");
  });

  it("should refresh a valid session and rotate the refresh token", async () => {
    const agent = request.agent(app);

    const loginResponse = await agent
      .post("/api/auth/login")
      .send({
        email: testUserEmail,
        password: TEST_PASSWORD,
      });

    expect(loginResponse.status).toBe(200);

    const refreshCookie = (
      loginResponse.headers["set-cookie"] ?? []
    ).find((cookie) => cookie.startsWith("refreshToken="));

    expect(refreshCookie).toBeDefined();

    const oldRefreshToken = refreshCookie!
      .split(";")[0]!
      .substring("refreshToken=".length);

    const oldRefreshTokenHash = hashRefreshToken(oldRefreshToken);

    const refreshResponse = await agent
      .post("/api/auth/refresh");

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.message).toBe(
      "Session refreshed successfully"
    );

    const newRefreshCookie = (
      refreshResponse.headers["set-cookie"] ?? []
    ).find((cookie) => cookie.startsWith("refreshToken="));

    expect(newRefreshCookie).toBeDefined();

    const newRefreshToken = newRefreshCookie!
      .split(";")[0]!
      .substring("refreshToken=".length);

    expect(newRefreshToken).not.toBe(oldRefreshToken);

    const sessionResult = await pool.query<{
      refresh_token_hash: string;
      revoked_at: Date | null;
    }>(
      `SELECT refresh_token_hash, revoked_at
       FROM sessions
       WHERE user_id = $1`,
      [testUserId]
    );

    expect(sessionResult.rows).toHaveLength(1);
    expect(sessionResult.rows[0]?.refresh_token_hash).toBe(
      hashRefreshToken(newRefreshToken)
    );
    expect(sessionResult.rows[0]?.refresh_token_hash).not.toBe(
      oldRefreshTokenHash
    );
    expect(sessionResult.rows[0]?.revoked_at).toBeNull();

    const meResponse = await agent.get("/api/auth/me");

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.success).toBe(true);
  });

  it("should reject reuse of an old refresh token after rotation", async () => {
    const agent = request.agent(app);

    const loginResponse = await agent
      .post("/api/auth/login")
      .send({
        email: testUserEmail,
        password: TEST_PASSWORD,
      });

    expect(loginResponse.status).toBe(200);

    const refreshCookie = (
      loginResponse.headers["set-cookie"] ?? []
    ).find((cookie) => cookie.startsWith("refreshToken="));

    expect(refreshCookie).toBeDefined();

    const oldRefreshToken = refreshCookie!
      .split(";")[0]!
      .substring("refreshToken=".length);

    const refreshResponse = await agent
      .post("/api/auth/refresh");

    expect(refreshResponse.status).toBe(200);

    const replayResponse = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refreshToken=${oldRefreshToken}`);

    expect(replayResponse.status).toBe(401);
    expect(replayResponse.body.success).toBe(false);
  });

  it("should revoke the session and block access after logout", async () => {
    const agent = request.agent(app);

    const loginResponse = await agent
      .post("/api/auth/login")
      .send({
        email: testUserEmail,
        password: TEST_PASSWORD,
      });

    expect(loginResponse.status).toBe(200);

    const refreshCookie = (
      loginResponse.headers["set-cookie"] ?? []
    ).find((cookie) => cookie.startsWith("refreshToken="));

    expect(refreshCookie).toBeDefined();

    const refreshToken = refreshCookie!
      .split(";")[0]!
      .substring("refreshToken=".length);

    const refreshTokenHash = hashRefreshToken(refreshToken);

    const meBeforeLogout = await agent.get("/api/auth/me");

    expect(meBeforeLogout.status).toBe(200);

    const logoutResponse = await agent
      .post("/api/auth/logout");

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);
    expect(logoutResponse.body.message).toBe(
      "Logged out successfully"
    );

    const meAfterLogout = await agent.get("/api/auth/me");

    expect(meAfterLogout.status).toBe(401);

    const sessionResult = await pool.query<{
      revoked_at: Date | null;
    }>(
      `SELECT revoked_at
       FROM sessions
       WHERE user_id = $1
         AND refresh_token_hash = $2`,
      [testUserId, refreshTokenHash]
    );

    expect(sessionResult.rows).toHaveLength(1);
    expect(sessionResult.rows[0]?.revoked_at).not.toBeNull();
  });

  it("should reject refresh after logout", async () => {
    const agent = request.agent(app);

    const loginResponse = await agent
      .post("/api/auth/login")
      .send({
        email: testUserEmail,
        password: TEST_PASSWORD,
      });

    expect(loginResponse.status).toBe(200);

    const logoutResponse = await agent
      .post("/api/auth/logout");

    expect(logoutResponse.status).toBe(200);

    const refreshResponse = await agent
      .post("/api/auth/refresh");

    expect(refreshResponse.status).toBe(401);
    expect(refreshResponse.body.success).toBe(false);
  });
});
