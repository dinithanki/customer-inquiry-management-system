
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

// GET /api/users
router.get("/", getStaff);

// GET /api/users/:id
router.get("/:id", getStaffDetails);

// POST /api/users
router.post("/", createStaffAccount);

// PATCH /api/users/:id
router.patch("/:id", updateStaffDetails);

// PATCH /api/users/:id/status
router.patch("/:id/status", changeStaffStatus);

// POST /api/users/:id/reset-password
router.post("/:id/reset-password", resetStaffUserPassword);

export default router;
