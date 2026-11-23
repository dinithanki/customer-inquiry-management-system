
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

import {
  loginSchema,
  changePasswordSchema,
} from "../validators/auth.validator.js";

import { authenticateUser } from "../services/auth.service.js";
import { changeUserPassword } from "../services/password.service.js";

import {
  createSession,
  rotateRefreshToken,
  revokeSession,
} from "../services/session.service.js";

import { generateAccessToken } from "../utils/jwt.js";
import { generateRefreshToken } from "../utils/refresh-token.js";

// ==========================================
// COOKIE CONFIGURATION
// ==========================================

const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 15 * 60 * 1000,
  path: "/",
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/auth",
};

// ==========================================
// LOGIN CONTROLLER
// ==========================================

export async function login(req: Request, res: Response) {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid login details",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { email, password } = validation.data;

    const user = await authenticateUser(email, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const refreshToken = generateRefreshToken();

    const sessionId = await createSession(
      user.id,
      refreshToken
    );

    const accessToken = generateAccessToken({
      sub: user.id,
      role: user.role,
      sid: sessionId,
    });

    res.cookie("accessToken", accessToken, accessCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: { user },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
}

// ==========================================
// REFRESH TOKEN CONTROLLER
// ==========================================

export async function refresh(req: Request, res: Response) {
  try {
    const currentToken = req.cookies?.refreshToken;

    if (!currentToken || typeof currentToken !== "string") {
      return res.status(401).json({
        success: false,
        message: "Refresh token is missing",
      });
    }

    const newRefreshToken = generateRefreshToken();

    const session = await rotateRefreshToken(
      currentToken,
      newRefreshToken
    );

    if (!session) {
      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/auth",
      });

      return res.status(401).json({
        success: false,
        message: "Invalid or expired session. Please log in again.",
      });
    }

    const { user, sessionId } = session;

    const accessToken = generateAccessToken({
      sub: user.id,
      role: user.role,
      sid: sessionId,
    });

    res.cookie("accessToken", accessToken, accessCookieOptions);
    res.cookie("refreshToken", newRefreshToken, refreshCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Session refreshed successfully",
      data: { user },
    });
  } catch (error) {
    console.error("Refresh error:", error);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
}

// ==========================================
// LOGOUT CONTROLLER
// ==========================================

export async function logout(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (typeof refreshToken === "string" && refreshToken.length > 0) {
      await revokeSession(refreshToken);
    }

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
}

// ==========================================
// CHANGE PASSWORD CONTROLLER
// ==========================================

export async function changePassword(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // 1. Validate password information.
    const validation = changePasswordSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid password details",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { currentPassword, newPassword } = validation.data;

    // 2. Change password and revoke other sessions
    // within one database transaction.
    const result = await changeUserPassword({
      userId: req.user.id,
      currentSessionId: req.user.sessionId,
      currentPassword,
      newPassword,
    });

    if (result === "USER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "User account not found or inactive",
      });
    }

    if (result === "INVALID_CURRENT_PASSWORD") {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // 3. Return success.
    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to change password",
    });
  }
}

// ==========================================
// GET CURRENT AUTHENTICATED USER
// ==========================================

export function getMe(
  req: AuthenticatedRequest,
  res: Response
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  return res.status(200).json({
    success: true,
    message: "User information retrieved successfully",
    data: {
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    },
  });
}
