
import { afterAll, describe, expect, it } from "vitest";

import { pool } from "../src/config/database.js";

describe("Test Database Connection", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("should connect to the separate Neon test database", async () => {
    const result = await pool.query<{
      database: string;
    }>("SELECT current_database() AS database");

    expect(result.rows[0]?.database).toBe("customer_inquiry_db");
  });
});
