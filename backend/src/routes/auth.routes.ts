
import { Router } from "express";

import {
  login,
  refresh,
  logout,
  getMe,
  changePassword,
} from "../controllers/auth.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Log in to the system
 *     description: Authenticates a user and establishes an HTTP-only cookie-based session.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: YourPassword123
 *     responses:
 *       200:
 *         description: Login successful. Authentication cookies are set.
 *       400:
 *         description: Invalid request data.
 *       401:
 *         description: Invalid email or password, or inactive account.
 *       500:
 *         description: Internal server error.
 */
router.post("/login", login);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh access token
 *     description: Uses the refresh token cookie to rotate the session refresh token and issue a new access token.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Access token refreshed successfully.
 *       401:
 *         description: Missing, invalid, expired, or revoked refresh token.
 *       500:
 *         description: Internal server error.
 */
router.post("/refresh", refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Log out
 *     description: Revokes the current refresh-token session and clears authentication cookies.
 *     security: []
 *     responses:
 *       200:
 *         description: Logout successful.
 *       500:
 *         description: Internal server error.
 */
router.post("/logout", logout);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current authenticated user
 *     description: Returns the identity and role of the currently authenticated user.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user returned successfully.
 *       401:
 *         description: Authentication required or session invalid.
 *       500:
 *         description: Internal server error.
 */
router.get("/me", requireAuth, getMe);

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Change current user's password
 *     description: Changes the authenticated user's password. This endpoint is accessible even when the user must change a temporary password.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password changed successfully.
 *       400:
 *         description: Invalid request data or current password.
 *       401:
 *         description: Authentication required.
 *       500:
 *         description: Internal server error.
 */
router.post("/change-password", requireAuth, changePassword);

export default router;
