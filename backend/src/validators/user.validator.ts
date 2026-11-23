
import { z } from "zod";

// ==========================================
// CREATE STAFF VALIDATION
// ==========================================

export const createStaffSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),

  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .max(255)
    .transform((value) => value.toLowerCase()),
});

// ==========================================
// UPDATE STAFF VALIDATION
// ==========================================

export const updateStaffSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),

  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .max(255)
    .transform((value) => value.toLowerCase())
    .optional(),
}).refine(
  (data) => data.name !== undefined || data.email !== undefined,
  {
    message: "At least one field must be provided",
  }
);

// ==========================================
// UPDATE STAFF STATUS VALIDATION
// ==========================================

export const updateStaffStatusSchema = z.object({
  isActive: z.boolean({
    error: "isActive must be true or false",
  }),
});

// ==========================================
// TYPES
// ==========================================

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
