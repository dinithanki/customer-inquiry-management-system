
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";

import { requireTrustedOrigin } from "../src/middleware/trusted-origin.middleware.js";

const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;

const app = express();

app.use(requireTrustedOrigin);

app.get("/test", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Request allowed",
  });
});

app.post("/test", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Request allowed",
  });
});

describe("Trusted Origin Middleware Tests", () => {
  beforeAll(() => {
    process.env.FRONTEND_ORIGIN = "http://localhost:3000";
  });

  afterAll(() => {
    if (originalFrontendOrigin === undefined) {
      delete process.env.FRONTEND_ORIGIN;
    } else {
      process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
    }
  });

  it("should allow requests from the trusted frontend origin", async () => {
    const response = await request(app)
      .post("/test")
      .set("Origin", "http://localhost:3000");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should reject requests from an untrusted origin", async () => {
    const response = await request(app)
      .post("/test")
      .set("Origin", "http://evil-site.com");

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Request origin is not allowed");
  });

  it("should reject requests with an untrusted referer", async () => {
    const response = await request(app)
      .post("/test")
      .set("Referer", "http://evil-site.com/page");

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("should allow safe GET requests", async () => {
    const response = await request(app)
      .get("/test")
      .set("Origin", "http://evil-site.com");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should allow requests without Origin or Referer headers", async () => {
    const response = await request(app).post("/test");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
