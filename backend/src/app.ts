
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";

import { pool } from "./config/database.js";
import swaggerSpec from "./config/swagger.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import inquiryRoutes from "./routes/inquiry.routes.js";

import { requireTrustedOrigin } from "./middleware/trusted-origin.middleware.js";

const app = express();

const frontendOrigin =
  process.env.FRONTEND_ORIGIN || "http://localhost:3000";

// ============================================
// SECURITY MIDDLEWARE
// ============================================

app.use(helmet());

// ============================================
// CORS CONFIGURATION
// ============================================

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// ============================================
// TRUSTED ORIGIN / CSRF PROTECTION
// ============================================

app.use(requireTrustedOrigin);

// ============================================
// REQUEST PARSING MIDDLEWARE
// ============================================

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// ============================================
// SWAGGER API DOCUMENTATION
// ============================================

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: "Customer Inquiry Management API",
  })
);

app.get("/api-docs.json", (_req, res) => {
  res.status(200).json(swaggerSpec);
});

// ============================================
// HEALTH CHECK
// ============================================

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Check API health
 *     description: Checks whether the Customer Inquiry Management API is running.
 *     security: []
 *     responses:
 *       200:
 *         description: API is running successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Customer Inquiry Management API is running
 */
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Customer Inquiry Management API is running",
  });
});

// ============================================
// DATABASE HEALTH CHECK
// ============================================

/**
 * @openapi
 * /api/health/db:
 *   get:
 *     tags:
 *       - Health
 *     summary: Check database connection
 *     description: Checks whether the API can communicate with its PostgreSQL database.
 *     security: []
 *     responses:
 *       200:
 *         description: Database connection successful.
 *       500:
 *         description: Database connection failed.
 */
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

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/inquiries", inquiryRoutes);

export default app;
