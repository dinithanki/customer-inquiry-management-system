
import { Router } from "express";

import {
  getStaff,
  getStaffDetails,
  createStaffAccount,
  updateStaffDetails,
  changeStaffStatus,
  resetStaffUserPassword,
} from "../controllers/user.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/role.middleware.js";
import { requirePasswordChangeComplete } from "../middleware/password-change.middleware.js";

const router = Router();

// All user-management endpoints require authentication,
// completed password change, and ADMIN privileges.
router.use(requireAuth);
router.use(requirePasswordChangeComplete);
router.use(requireAdmin);

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - Staff Management
 *     summary: Get all staff accounts
 *     description: Returns the staff directory. Requires ADMIN privileges.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Staff accounts retrieved successfully.
 *       401:
 *         description: Authentication required or session invalid.
 *       403:
 *         description: Admin access required or password change required.
 *       500:
 *         description: Internal server error.
 */
router.get("/", getStaff);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Staff Management
 *     summary: Get staff account details
 *     description: Retrieves an individual staff account using its UUID.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Staff account UUID.
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Staff account retrieved successfully.
 *       400:
 *         description: Invalid staff account ID.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin access required or password change required.
 *       404:
 *         description: Staff account not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/:id", getStaffDetails);

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags:
 *       - Staff Management
 *     summary: Create a staff account
 *     description: Creates a new staff account. The email is normalized to lowercase. Requires ADMIN privileges.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: John Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 example: john@example.com
 *                 description: Leading and trailing whitespace is trimmed. Email is converted to lowercase.
 *     responses:
 *       201:
 *         description: Staff account created successfully.
 *       400:
 *         description: Invalid staff account data.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin access required or password change required.
 *       409:
 *         description: Staff account already exists.
 *       500:
 *         description: Internal server error.
 */
router.post("/", createStaffAccount);

/**
 * @openapi
 * /api/users/{id}:
 *   patch:
 *     tags:
 *       - Staff Management
 *     summary: Update staff account details
 *     description: Updates a staff member's name, email, or both. At least one field must be supplied. Email is normalized to lowercase.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Staff account UUID.
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: John Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 example: john.silva@example.com
 *                 description: Leading and trailing whitespace is trimmed. Email is converted to lowercase.
 *     responses:
 *       200:
 *         description: Staff account updated successfully.
 *       400:
 *         description: Invalid staff account data or no fields provided.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin access required or password change required.
 *       404:
 *         description: Staff account not found.
 *       409:
 *         description: Email address already exists.
 *       500:
 *         description: Internal server error.
 */
router.patch("/:id", updateStaffDetails);

/**
 * @openapi
 * /api/users/{id}/status:
 *   patch:
 *     tags:
 *       - Staff Management
 *     summary: Change staff account status
 *     description: Activates or deactivates a staff account. Requires ADMIN privileges.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Staff account UUID.
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: false
 *                 description: True activates the account; false deactivates it.
 *     responses:
 *       200:
 *         description: Staff account status updated successfully.
 *       400:
 *         description: Invalid status data or staff account ID.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin access required or operation forbidden.
 *       404:
 *         description: Staff account not found.
 *       500:
 *         description: Internal server error.
 */
router.patch("/:id/status", changeStaffStatus);

/**
 * @openapi
 * /api/users/{id}/reset-password:
 *   post:
 *     tags:
 *       - Staff Management
 *     summary: Reset staff account password
 *     description: Resets a staff member's password. Requires ADMIN privileges.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Staff account UUID.
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Staff password reset successfully.
 *       400:
 *         description: Invalid staff account ID.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin access required or operation forbidden.
 *       404:
 *         description: Staff account not found.
 *       500:
 *         description: Internal server error.
 */
router.post("/:id/reset-password", resetStaffUserPassword);

export default router;
