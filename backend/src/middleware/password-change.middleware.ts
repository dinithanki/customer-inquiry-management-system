
import type { Request, Response, NextFunction } from "express";
import "./auth.middleware.js";
import { pool } from "../config/database.js";

export async function requirePasswordChangeComplete(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const result = await pool.query<{ must_change_password: boolean }>(
      `SELECT must_change_password
       FROM users
       WHERE id = $1
         AND is_active = TRUE`,
      [req.user.id]
    );

    const user = result.rows[0];

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User account not found or inactive",
      });
      return;
    }

    if (user.must_change_password) {
      res.status(403).json({
        success: false,
        message: "You must change your password before accessing this resource",
        code: "PASSWORD_CHANGE_REQUIRED",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Password change middleware error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to verify password change status",
    });
  }
}
