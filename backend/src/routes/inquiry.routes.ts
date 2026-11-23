
import { Router } from "express";

import {
  createInquiryController,
  checkDuplicateInquiries,
  getAllInquiries,
  getInquiryDetails,
  changeInquiryStatus,
  deleteInquiryController,
} from "../controllers/inquiry.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePasswordChangeComplete } from "../middleware/password-change.middleware.js";
import { requireAdmin } from "../middleware/role.middleware.js";

const router = Router();

// All inquiry endpoints require authentication
// and a completed password change.
router.use(requireAuth);
router.use(requirePasswordChangeComplete);

/**
 * @openapi
 * /api/inquiries/check-duplicates:
 *   post:
 *     tags:
 *       - Inquiries
 *     summary: Check for duplicate inquiries
 *     description: Checks whether active inquiries already exist for the submitted contact information.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Contact information used by the duplicate-check endpoint.
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Duplicate check completed successfully.
 *       400:
 *         description: Invalid request data.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Password change required.
 *       500:
 *         description: Internal server error.
 */
router.post("/check-duplicates", checkDuplicateInquiries);

/**
 * @openapi
 * /api/inquiries:
 *   post:
 *     tags:
 *       - Inquiries
 *     summary: Create a customer inquiry
 *     description: Creates a new inquiry. Duplicate active inquiries may require explicit confirmation.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerName
 *               - contactMethod
 *               - contact
 *               - subject
 *               - description
 *             properties:
 *               customerName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 150
 *                 example: John Silva
 *                 description: Leading and trailing whitespace is trimmed.
 *               contactMethod:
 *                 type: string
 *                 enum:
 *                   - PHONE
 *                   - EMAIL
 *                   - WHATSAPP
 *                 example: PHONE
 *               contact:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *                 example: "+94771234567"
 *                 description: Contact information. Leading and trailing whitespace is trimmed.
 *               subject:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *                 example: Product delivery inquiry
 *                 description: Leading and trailing whitespace is trimmed.
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *                 example: Customer wants to know the delivery status of an order.
 *                 description: Leading and trailing whitespace is trimmed.
 *               confirmDuplicate:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *                 description: Set to true to confirm creation when an active duplicate is detected.
 *     responses:
 *       201:
 *         description: Inquiry created successfully.
 *       400:
 *         description: Inquiry validation failed.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Password change required.
 *       409:
 *         description: Duplicate inquiry detected or confirmation required.
 *       500:
 *         description: Internal server error.
 */
router.post("/", createInquiryController);

/**
 * @openapi
 * /api/inquiries:
 *   get:
 *     tags:
 *       - Inquiries
 *     summary: Get all active inquiries
 *     description: Retrieves active inquiries with search, status filtering and pagination. Deleted inquiries are excluded.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         description: Search inquiries using the supported search fields.
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         required: false
 *         description: Filter inquiries by status.
 *         schema:
 *           type: string
 *           enum:
 *             - NEW
 *             - IN_PROGRESS
 *             - RESOLVED
 *       - in: query
 *         name: page
 *         required: false
 *         description: Page number.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of records per page.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *     responses:
 *       200:
 *         description: Inquiries retrieved successfully.
 *       400:
 *         description: Invalid query parameters.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Password change required.
 *       500:
 *         description: Internal server error.
 */
router.get("/", getAllInquiries);

/**
 * @openapi
 * /api/inquiries/{id}:
 *   delete:
 *     tags:
 *       - Inquiries
 *     summary: Soft-delete an inquiry
 *     description: Marks an inquiry as deleted without physically removing its database record. ADMIN privileges are required.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Inquiry UUID.
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Inquiry deleted successfully.
 *       400:
 *         description: Invalid inquiry ID.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin access required or password change required.
 *       404:
 *         description: Inquiry not found or already deleted.
 *       500:
 *         description: Internal server error.
 */
router.delete("/:id", requireAdmin, deleteInquiryController);

/**
 * @openapi
 * /api/inquiries/{id}:
 *   get:
 *     tags:
 *       - Inquiries
 *     summary: Get inquiry details
 *     description: Retrieves an individual active inquiry, including its status history.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Inquiry UUID.
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Inquiry details retrieved successfully.
 *       400:
 *         description: Invalid inquiry ID.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Password change required.
 *       404:
 *         description: Inquiry not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/:id", getInquiryDetails);

/**
 * @openapi
 * /api/inquiries/{id}/status:
 *   patch:
 *     tags:
 *       - Inquiries
 *     summary: Update inquiry status
 *     description: Updates an inquiry status using version-based concurrency checking. Only permitted lifecycle transitions are accepted.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Inquiry UUID.
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
 *               - status
 *               - version
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - NEW
 *                   - IN_PROGRESS
 *                   - RESOLVED
 *                 example: IN_PROGRESS
 *               version:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *                 description: Current inquiry version. Must match the version stored by the server.
 *     responses:
 *       200:
 *         description: Inquiry status updated successfully.
 *       400:
 *         description: Invalid status, version or inquiry ID.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Password change required.
 *       404:
 *         description: Inquiry not found.
 *       409:
 *         description: Invalid status transition or stale inquiry version.
 *       500:
 *         description: Internal server error.
 */
router.patch("/:id/status", changeInquiryStatus);

export default router;
