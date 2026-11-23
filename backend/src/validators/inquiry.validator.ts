
import { z } from "zod";

// ============================================
// CREATE INQUIRY VALIDATION
// ============================================

export const createInquirySchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Customer name must contain at least 2 characters")
    .max(150, "Customer name cannot exceed 150 characters"),

  contactMethod: z.enum(["PHONE", "EMAIL", "WHATSAPP"]),

  contact: z
    .string()
    .trim()
    .min(3, "Contact information is required")
    .max(255, "Contact information cannot exceed 255 characters"),

  subject: z
    .string()
    .trim()
    .min(3, "Subject must contain at least 3 characters")
    .max(200, "Subject cannot exceed 200 characters"),

  description: z
    .string()
    .trim()
    .min(10, "Description must contain at least 10 characters")
    .max(5000, "Description cannot exceed 5000 characters"),

  confirmDuplicate: z.boolean().optional().default(false),
});

export type CreateInquiryInput = z.infer<
  typeof createInquirySchema
>;


// ============================================
// UPDATE INQUIRY STATUS VALIDATION
// ============================================

export const updateInquiryStatusSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]),

  version: z
    .number()
    .int()
    .positive("Version must be a positive integer"),
});

export type UpdateInquiryStatusInput = z.infer<
  typeof updateInquiryStatusSchema
>;
