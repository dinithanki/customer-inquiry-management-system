
import "dotenv/config";
import { pool } from "../config/database.js";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

// A fixed PostgreSQL advisory lock ID for this migration system.
const MIGRATION_LOCK_ID = 731942001;

async function migrate() {
  const client = await pool.connect();

  let lockAcquired = false;

  try {
    // Prevent multiple migration runners from executing simultaneously.
    await client.query(
      "SELECT pg_advisory_lock($1)",
      [MIGRATION_LOCK_ID]
    );

    lockAcquired = true;

    console.log("Migration lock acquired.");

    // Create migration tracking table.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Find all SQL migration files.
    const migrationsDirectory = path.resolve(
      currentDirectory,
      "../../migrations"
    );

    const files = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("No migration files found.");
    }

    for (const file of files) {
      // Check whether migration was already executed.
      const existing = await client.query(
        "SELECT id FROM schema_migrations WHERE migration_name = $1",
        [file]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        console.log(`${file} already executed. Skipping.`);
        continue;
      }

      const migrationPath = path.join(migrationsDirectory, file);
      const sql = await readFile(migrationPath, "utf8");

      // Reject empty migration files.
      if (!sql.trim()) {
        throw new Error(
          `Migration file ${file} is empty. Migration stopped.`
        );
      }

      console.log(`Running migration: ${file}`);

      await client.query("BEGIN");

      try {
        // Execute migration SQL.
        await client.query(sql);

        // Record migration only after successful execution.
        await client.query(
          "INSERT INTO schema_migrations (migration_name) VALUES ($1)",
          [file]
        );

        await client.query("COMMIT");

        console.log(`${file} executed successfully.`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log("All migrations completed.");
  } finally {
    // Release the advisory lock before returning the connection.
    if (lockAcquired) {
      try {
        await client.query(
          "SELECT pg_advisory_unlock($1)",
          [MIGRATION_LOCK_ID]
        );

        console.log("Migration lock released.");
      } catch (error) {
        console.error("Failed to release migration lock:", error);
      }
    }

    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
