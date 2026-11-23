
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { pool } from "./config/database.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import inquiryRoutes from "./routes/inquiry.routes.js";

const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

app.use(helmet());

// ============================================
// CORS CONFIGURATION
// ============================================

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// ============================================
// REQUEST PARSING MIDDLEWARE
// ============================================

app.use(express.json());
app.use(cookieParser());

// ============================================
// HEALTH CHECK
// ============================================

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Customer Inquiry Management API is running",
  });
});

// ============================================
// DATABASE HEALTH CHECK
// ============================================

app.get("/api/health/db", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS database,
        NOW() AS server_time
    `);

    res.status(200).json({
      success: true,
      message: "Neon database connected successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// ============================================
// API ROUTES
// ============================================

// Authentication routes
app.use("/api/auth", authRoutes);

// Staff management routes (ADMIN only)
app.use("/api/users", userRoutes);

// Inquiry management routes (ADMIN and STAFF)
app.use("/api/inquiries", inquiryRoutes);

export default app;
