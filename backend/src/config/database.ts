
import { Pool } from "pg";

const isTestEnvironment = process.env.NODE_ENV === "test";

const databaseUrl = isTestEnvironment
  ? process.env.DATABASE_URL_TEST
  : process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    isTestEnvironment
      ? "DATABASE_URL_TEST is missing. Cannot run tests safely."
      : "DATABASE_URL is missing."
  );
}

export const pool = new Pool({
  connectionString: databaseUrl,

  // Verify the PostgreSQL server's TLS certificate.
  ssl: {
    rejectUnauthorized: true,
  },

  // Maximum number of simultaneous connections.
  max: 10,

  // Close unused connections after 30 seconds.
  idleTimeoutMillis: 30000,

  // Fail if a database connection cannot be established within 5 seconds.
  connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});
