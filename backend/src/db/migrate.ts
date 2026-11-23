
import "dotenv/config";
import { pool } from "../config/database.js";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

async function migrate() {
  const client = await pool.connect();

  try {
    // Create migration tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Find all SQL migration files
    const migrationsDirectory = path.resolve(
      currentDirectory,
      "../../migrations"
    );

    const files = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      // Check whether migration was already executed
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

      console.log(`Running migration: ${file}`);

      await client.query("BEGIN");

      try {
        await client.query(sql);

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
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
