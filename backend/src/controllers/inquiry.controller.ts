
import type { Request, Response } from "express";
import { z } from "zod";

import {
  createInquiry,
  findDuplicateInquiries,
  getInquiries,
  getInquiryById,
  updateInquiryStatus,
  deleteInquiry,
} from "../services/inquiry.service.js";

import {
  createInquirySchema,
  updateInquiryStatusSchema,
} from "../validators/inquiry.validator.js";

// ============================================
// VALIDATION SCHEMAS
// ============================================

const duplicateCheckSchema = z.object({
  contact: z.string().trim().min(3).max(255),
  contactMethod: z.enum(["PHONE", "EMAIL", "WHATSAPP"]),
});

const inquiryListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]).optional(),
  sortBy: z.enum(["created_at", "customer_name"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const inquiryIdSchema = z.string().uuid();

// ============================================
// HELPER: GET AUTHENTICATED USER ID
// ============================================

function getStaffId(req: Request): string | null {
  return req.user?.id ?? null;
}

// ============================================
// CREATE INQUIRY
// POST /api/inquiries
// ============================================

export async function createInquiryController(
  req: Request,
  res: Response
): Promise<void> {
  const staffId = getStaffId(req);

  if (!staffId) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  const validation = createInquirySchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid inquiry information",
      errors: validation.error.flatten(),
    });
    return;
  }

  try {
    const inquiry = await createInquiry(
      validation.data,
      staffId
    );

    res.status(201).json({
      success: true,
      message: "Inquiry created successfully",
      data: inquiry,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "DUPLICATE_INQUIRY"
    ) {
      const duplicateError = error as Error & {
        duplicates?: unknown[];
      };

      res.status(409).json({
        success: false,
        code: "DUPLICATE_INQUIRY",
        message: "Similar active inquiries already exist",
        duplicates: duplicateError.duplicates ?? [],
      });
      return;
    }

    console.error("Create inquiry error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create inquiry",
    });
  }
}

// ============================================
// CHECK DUPLICATE INQUIRIES
// POST /api/inquiries/check-duplicates
// ============================================

export async function checkDuplicateInquiries(
  req: Request,
  res: Response
): Promise<void> {
  const validation = duplicateCheckSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid contact information",
      errors: validation.error.flatten(),
    });
    return;
  }

  try {
    const duplicates = await findDuplicateInquiries(
      validation.data.contact,
      validation.data.contactMethod
    );

    res.status(200).json({
      success: true,
      hasDuplicates: duplicates.length > 0,
      data: duplicates,
    });
  } catch (error) {
    console.error("Duplicate check error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to check duplicate inquiries",
    });
  }
}

// ============================================
// GET ALL INQUIRIES
// GET /api/inquiries
// ============================================

export async function getAllInquiries(
  req: Request,
  res: Response
): Promise<void> {
  const validation = inquiryListQuerySchema.safeParse(req.query);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid inquiry filters",
      errors: validation.error.flatten(),
    });
    return;
  }

  try {
    const inquiries = await getInquiries(validation.data);

    res.status(200).json({
      success: true,
      data: inquiries.data,
      pagination: inquiries.pagination,
    });
  } catch (error) {
    console.error("Get inquiries error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve inquiries",
    });
  }
}

// ============================================
// GET SINGLE INQUIRY
// GET /api/inquiries/:id
// ============================================

export async function getInquiryDetails(
  req: Request,
  res: Response
): Promise<void> {
  const validation = inquiryIdSchema.safeParse(req.params.id);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid inquiry ID",
    });
    return;
  }

  try {
    const inquiry = await getInquiryById(validation.data);

    if (!inquiry) {
      res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error("Get inquiry details error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve inquiry details",
    });
  }
}

// ============================================
// UPDATE INQUIRY STATUS
// PATCH /api/inquiries/:id/status
// ============================================

export async function changeInquiryStatus(
  req: Request,
  res: Response
): Promise<void> {
  const staffId = getStaffId(req);

  if (!staffId) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  const idValidation = inquiryIdSchema.safeParse(req.params.id);

  if (!idValidation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid inquiry ID",
    });
    return;
  }

  const bodyValidation = updateInquiryStatusSchema.safeParse(
    req.body
  );

  if (!bodyValidation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid status update information",
      errors: bodyValidation.error.flatten(),
    });
    return;
  }

  try {
    const inquiry = await updateInquiryStatus(
      idValidation.data,
      bodyValidation.data,
      staffId
    );

    res.status(200).json({
      success: true,
      message: "Inquiry status updated successfully",
      data: inquiry,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INQUIRY_NOT_FOUND") {
        res.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
        return;
      }

      if (error.message === "STALE_INQUIRY_VERSION") {
        res.status(409).json({
          success: false,
          code: "STALE_INQUIRY_VERSION",
          message:
            "This inquiry was updated by another staff member. Please refresh and try again.",
        });
        return;
      }

      if (error.message === "INVALID_STATUS_TRANSITION") {
        res.status(409).json({
          success: false,
          code: "INVALID_STATUS_TRANSITION",
          message: "This status transition is not allowed",
        });
        return;
      }
    }

    console.error("Update inquiry status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update inquiry status",
    });
  }
}

// ============================================
// DELETE INQUIRY (ADMIN ONLY)
// DELETE /api/inquiries/:id
// ============================================

export async function deleteInquiryController(
  req: Request,
  res: Response
): Promise<void> {
  // Additional authorization check.
  // The route will also use requireAdmin middleware.
  if (!req.user || req.user.role !== "ADMIN") {
    res.status(403).json({
      success: false,
      message: "Admin access required",
    });
    return;
  }

  const idValidation = inquiryIdSchema.safeParse(req.params.id);

  if (!idValidation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid inquiry ID",
    });
    return;
  }

  try {
    const deletedInquiry = await deleteInquiry(
      idValidation.data,
      req.user.id
    );

    if (!deletedInquiry) {
      res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Inquiry deleted successfully",
      data: deletedInquiry,
    });
  } catch (error) {
    console.error("Delete inquiry error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete inquiry",
    });
  }
}
