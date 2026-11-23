
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

const TEST_PASSWORD = "InquiryConcurrencyTest123!";

interface TestUser {
  id: string;
  email: string;
}

type TestAgent = ReturnType<typeof request.agent>;

let staffAgentA: TestAgent;
let staffAgentB: TestAgent;

const createdUserIds: string[] = [];
const createdInquiryIds: string[] = [];

const uniqueId = randomUUID();

async function createTestStaff(
  email: string
): Promise<TestUser> {
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
    [
      "Concurrency Test Staff",
      email,
      passwordHash,
    ]
  );

  const staff = result.rows[0];

  if (!staff) {
    throw new Error("Failed to create concurrency test staff.");
  }

  createdUserIds.push(staff.id);

  return staff;
}

async function loginStaff(email: string): Promise<TestAgent> {
  const agent = request.agent(app);

  const response = await agent
    .post("/api/auth/login")
    .send({
      email,
      password: TEST_PASSWORD,
    });

  if (response.status !== 200) {
    throw new Error(
      `Concurrency test staff login failed: ${response.status}`
    );
  }

  return agent;
}

describe("Inquiry Creation Concurrency Tests", () => {
  beforeAll(async () => {
    // Protect the production database from test operations.
    if (
      process.env.NODE_ENV !== "test" ||
      !process.env.DATABASE_URL_TEST
    ) {
      throw new Error(
        "Concurrency tests must use DATABASE_URL_TEST."
      );
    }

    // Verify the actual database before creating test accounts.
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

    // Create two independent STAFF accounts.
    const staffA = await createTestStaff(
      `concurrency-a-${uniqueId}@example.com`
    );

    const staffB = await createTestStaff(
      `concurrency-b-${uniqueId}@example.com`
    );

    // Give each staff member a separate authenticated session.
    staffAgentA = await loginStaff(staffA.email);
    staffAgentB = await loginStaff(staffB.email);
  });

  afterAll(async () => {
    // Remove inquiries created by this test.
    if (createdInquiryIds.length > 0) {
      await pool.query(
        `DELETE FROM inquiries
         WHERE id = ANY($1::uuid[])`,
        [createdInquiryIds]
      );
    }

    // Remove sessions belonging to temporary staff accounts.
    if (createdUserIds.length > 0) {
      await pool.query(
        `DELETE FROM sessions
         WHERE user_id = ANY($1::uuid[])`,
        [createdUserIds]
      );

      // Delete only temporary test users.
      await pool.query(
        `DELETE FROM users
         WHERE id = ANY($1::uuid[])`,
        [createdUserIds]
      );
    }
  });

  it(
    "should prevent simultaneous duplicate inquiry creation",
    async () => {
      const contact = `077${randomUUID()
        .replace(/\D/g, "")
        .slice(0, 7)}`;

      // Both staff members submit the same contact simultaneously.
      const [responseA, responseB] = await Promise.all([
        staffAgentA
          .post("/api/inquiries")
          .send({
            customerName: "Concurrent Customer A",
            contactMethod: "PHONE",
            contact,
            subject: "Concurrent Inquiry A",
            description:
              "First simultaneous inquiry submission for testing.",
          }),

        staffAgentB
          .post("/api/inquiries")
          .send({
            customerName: "Concurrent Customer B",
            contactMethod: "PHONE",
            contact,
            subject: "Concurrent Inquiry B",
            description:
              "Second simultaneous inquiry submission for testing.",
          }),
      ]);

      // Keep track of any successfully created inquiries.
      if (responseA.status === 201) {
        createdInquiryIds.push(responseA.body.data.id);
      }

      if (responseB.status === 201) {
        createdInquiryIds.push(responseB.body.data.id);
      }

      const statuses = [
        responseA.status,
        responseB.status,
      ].sort((a, b) => a - b);

      // Exactly one request must succeed.
      expect(statuses).toEqual([201, 409]);

      // The rejected request must identify the duplicate.
      const rejectedResponse =
        responseA.status === 409 ? responseA : responseB;

      expect(rejectedResponse.body.success).toBe(false);
      expect(rejectedResponse.body.code).toBe(
        "DUPLICATE_INQUIRY"
      );

      expect(
        rejectedResponse.body.duplicates.length
      ).toBeGreaterThan(0);

      // Verify that exactly one active inquiry exists for this contact.
      const databaseResult = await pool.query<{
        total: string;
      }>(
        `SELECT COUNT(*) AS total
         FROM inquiries
         WHERE normalized_contact = $1
           AND status IN ('NEW', 'IN_PROGRESS')
           AND is_deleted = FALSE`,
        [contact]
      );

      expect(Number(databaseResult.rows[0]?.total)).toBe(1);
    },
    15000
  );
});
