
import "dotenv/config";
import bcrypt from "bcrypt";
import { pool } from "../config/database.js";

async function seedAdmin() {
  const name = process.env.INITIAL_ADMIN_NAME;
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error("Initial admin environment variables are required.");
  }

  if (password.length < 12) {
    throw new Error("Initial admin password must be at least 12 characters.");
  }

  try {
    const existingAdmin = await pool.query(
      "SELECT id FROM users WHERE role = 'ADMIN'"
    );

    if (existingAdmin.rowCount && existingAdmin.rowCount > 0) {
      console.log("An ADMIN account already exists. Skipping seed.");
      return;
    }

    const existingEmail = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingEmail.rowCount && existingEmail.rowCount > 0) {
      throw new Error("This email is already registered.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        must_change_password
      ) VALUES ($1, $2, $3, 'ADMIN', FALSE)`,
      [name, email, passwordHash]
    );

    console.log("Initial ADMIN account created successfully.");
  } finally {
    await pool.end();
  }
}

seedAdmin().catch((error) => {
  console.error("Admin seeding failed:", error);
  process.exitCode = 1;
});
