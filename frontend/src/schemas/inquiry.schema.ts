import { z } from "zod";

export const inquirySchema = z.object({
  customerName: z.string().trim().min(2).max(150),
  contactMethod: z.enum(["PHONE", "EMAIL", "WHATSAPP"]),
  contact: z.string().trim().min(3).max(255),
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
});

export type InquiryValues = z.infer<typeof inquirySchema>;
