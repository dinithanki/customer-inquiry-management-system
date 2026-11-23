
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

// Check duplicate inquiries.
router.post("/check-duplicates", checkDuplicateInquiries);

// Create a new inquiry.
router.post("/", createInquiryController);

// Get all inquiries with search, filters and pagination.
router.get("/", getAllInquiries);

// Delete an inquiry (ADMIN only).
router.delete("/:id", requireAdmin, deleteInquiryController);

// Get a single inquiry with its status history.
router.get("/:id", getInquiryDetails);

// Update inquiry status.
router.patch("/:id/status", changeInquiryStatus);

export default router;
