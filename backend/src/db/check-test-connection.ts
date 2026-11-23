
import "dotenv/config";

import { Pool } from "pg";

async function checkTestConnection(): Promise<void> {
  const connectionString = process.env.DATABASE_URL_TEST;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL_TEST is missing from your backend .env file."
    );
  }

  const testPool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    const result = await testPool.query(`
      SELECT
        current_database() AS database,
        current_user AS username,
        NOW() AS server_time
    `);

    console.log("Test database connection successful!");
    console.log("Database:", result.rows[0].database);
    console.log("Username:", result.rows[0].username);
    console.log("Server time:", result.rows[0].server_time);
  } catch (error) {
    console.error("Test database connection failed:", error);
    process.exitCode = 1;
  } finally {
    await testPool.end();
  }
}

checkTestConnection().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
