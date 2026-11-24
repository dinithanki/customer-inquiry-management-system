
import type { Request, Response } from "express";
import { z } from "zod";

import {
  createStaffSchema,
  updateStaffSchema,
  updateStaffStatusSchema,
} from "../validators/user.validator.js";

import {
  createStaff,
  getStaffList,
  getStaffById,
  updateStaff,
  updateStaffStatus,
  resetStaffPassword,
} from "../services/user.service.js";

// ==========================================
// STAFF ID VALIDATION
// ==========================================

const staffIdSchema = z.string().uuid();

// ==========================================
// GET STAFF LIST
// ==========================================

export async function getStaff(req: Request, res: Response) {
  try {
    const querySchema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      search: z.string().trim().max(100).default(""),
      sortBy: z.enum(["created_at", "name", "email"]).default("created_at"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    });

    const validation = querySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination or search parameters",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { page, limit, search, sortBy, sortOrder } = validation.data;

    const result = await getStaffList(page, limit, search, sortBy, sortOrder);

    return res.status(200).json({
      success: true,
      message: "Staff retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve staff",
    });
  }
}

// ==========================================
// GET STAFF BY ID
// ==========================================

export async function getStaffDetails(
  req: Request,
  res: Response
) {
  try {
    const validation = staffIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff ID",
      });
    }

    const staff = await getStaffById(validation.data);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Staff details retrieved successfully",
      data: { staff },
    });
  } catch (error) {
    console.error("Get staff details error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve staff details",
    });
  }
}

// ==========================================
// CREATE STAFF
// ==========================================

export async function createStaffAccount(
  req: Request,
  res: Response
) {
  try {
    const validation = createStaffSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff information",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const result = await createStaff(validation.data);

    if (!result) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Staff account created successfully",
      data: result,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    console.error("Create staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create staff account",
    });
  }
}

// ==========================================
// UPDATE STAFF DETAILS
// ==========================================

export async function updateStaffDetails(
  req: Request,
  res: Response
) {
  try {
    const idValidation = staffIdSchema.safeParse(req.params.id);

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff ID",
      });
    }

    const bodyValidation = updateStaffSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff information",
        errors: bodyValidation.error.flatten().fieldErrors,
      });
    }

    const staff = await updateStaff(
      idValidation.data,
      bodyValidation.data
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Staff details updated successfully",
      data: { staff },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    console.error("Update staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update staff details",
    });
  }
}

// ==========================================
// ACTIVATE / DEACTIVATE STAFF
// ==========================================

export async function changeStaffStatus(
  req: Request,
  res: Response
) {
  try {
    const idValidation = staffIdSchema.safeParse(req.params.id);

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff ID",
      });
    }

    const bodyValidation = updateStaffStatusSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff status",
        errors: bodyValidation.error.flatten().fieldErrors,
      });
    }

    const staff = await updateStaffStatus(
      idValidation.data,
      bodyValidation.data.isActive
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: staff.is_active
        ? "Staff account activated successfully"
        : "Staff account deactivated successfully",
      data: { staff },
    });
  } catch (error) {
    console.error("Change staff status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update staff status",
    });
  }
}

// ==========================================
// RESET STAFF PASSWORD
// ==========================================

export async function resetStaffUserPassword(
  req: Request,
  res: Response
) {
  try {
    const validation = staffIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff ID",
      });
    }

    const temporaryPassword = await resetStaffPassword(
      validation.data
    );

    if (!temporaryPassword) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Staff password reset successfully",
      data: {
        temporaryPassword,
        expiresIn: "24 hours",
        mustChangePassword: true,
      },
    });
  } catch (error) {
    console.error("Reset staff password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset staff password",
    });
  }
}
