
import type { Request, Response, NextFunction } from "express";

import { verifyAccessToken } from "../utils/jwt.js";
import { pool } from "../config/database.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "STAFF";
    sessionId: string;
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedRequest["user"];
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  // ==========================================
  // 1. READ ACCESS TOKEN
  // ==========================================

  const token = req.cookies?.accessToken;

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  // ==========================================
  // 2. VERIFY ACCESS TOKEN
  // ==========================================

  let decoded;

  try {
    decoded = verifyAccessToken(token);
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
    return;
  }

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    typeof decoded.sid !== "string" ||
    (decoded.role !== "ADMIN" && decoded.role !== "STAFF")
  ) {
    res.status(401).json({
      success: false,
      message: "Invalid access token",
    });
    return;
  }

  // ==========================================
  // 3. CHECK USER AND SESSION IN DATABASE
  // ==========================================

  try {
    const result = await pool.query<{
      id: string;
      name: string;
      email: string;
      role: "ADMIN" | "STAFF";
      is_active: boolean;
      session_id: string;
    }>(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.role,
         u.is_active,
         s.id AS session_id
       FROM users u
       INNER JOIN sessions s ON s.user_id = u.id
       WHERE u.id = $1
         AND s.id = $2
         AND u.is_active = TRUE
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()`,
      [decoded.sub, decoded.sid]
    );

    const authenticatedUser = result.rows[0];

    if (!authenticatedUser) {
      res.status(401).json({
        success: false,
        message: "Your session is invalid, expired, or revoked",
      });
      return;
    }

    // ==========================================
    // 4. ATTACH USER TO REQUEST
    // ==========================================

    req.user = {
      id: authenticatedUser.id,
      name: authenticatedUser.name,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
      sessionId: authenticatedUser.session_id,
    };

    // ==========================================
    // 5. CONTINUE REQUEST
    // ==========================================

    next();

  } catch (error) {
    console.error("Authentication middleware error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to verify your authentication",
    });
  }
}
