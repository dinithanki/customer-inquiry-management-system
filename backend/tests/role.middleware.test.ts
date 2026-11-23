
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import {
  requireAdmin,
  requireStaff,
} from "../src/middleware/role.middleware.js";

import type { AuthenticatedRequest } from "../src/middleware/auth.middleware.js";

function createTestApp(
  role: "ADMIN" | "STAFF" | null,
  middleware: typeof requireAdmin | typeof requireStaff
) {
  const app = express();

  app.use((req, _res, next) => {
    if (role !== null) {
      (req as AuthenticatedRequest).user = {
        id: "test-user-id",
        role,
        sessionId: "test-session-id",
      };
    }

    next();
  });

  app.get("/protected", middleware, (_req, res) => {
    res.status(200).json({
      success: true,
      message: "Access granted",
    });
  });

  return app;
}

describe("Admin Authorization", () => {
  it("should allow an ADMIN user", async () => {
    const app = createTestApp("ADMIN", requireAdmin);

    const response = await request(app).get("/protected");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Access granted");
  });

  it("should reject a STAFF user", async () => {
    const app = createTestApp("STAFF", requireAdmin);

    const response = await request(app).get("/protected");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Admin access required",
    });
  });

  it("should reject an unauthenticated user", async () => {
    const app = createTestApp(null, requireAdmin);

    const response = await request(app).get("/protected");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Authentication required",
    });
  });
});

describe("Staff Authorization", () => {
  it("should allow a STAFF user", async () => {
    const app = createTestApp("STAFF", requireStaff);

    const response = await request(app).get("/protected");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Access granted");
  });

  it("should reject an ADMIN user", async () => {
    const app = createTestApp("ADMIN", requireStaff);

    const response = await request(app).get("/protected");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Staff access required",
    });
  });
});
