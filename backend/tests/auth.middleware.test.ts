
import { describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";

describe("Authentication Security", () => {
  it("should reject unauthenticated access to GET /api/auth/me", async () => {
    const response = await request(app)
      .get("/api/auth/me");

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentication required",
    });
  });

  it("should reject unauthenticated access to GET /api/users", async () => {
    const response = await request(app)
      .get("/api/users");

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentication required",
    });
  });

  it("should reject unauthenticated access to GET /api/inquiries", async () => {
    const response = await request(app)
      .get("/api/inquiries");

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      success: false,
      message: "Authentication required",
    });
  });
});
