
import { describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";

describe("API Health Check", () => {
  it("should return HTTP 200 when the API is running", async () => {
    const response = await request(app)
      .get("/api/health");

    expect(response.status).toBe(200);
  });

  it("should return the correct health check response", async () => {
    const response = await request(app)
      .get("/api/health");

    expect(response.body).toEqual({
      success: true,
      message: "Customer Inquiry Management API is running",
    });
  });
});
