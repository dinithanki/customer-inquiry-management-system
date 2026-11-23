
import { describe, expect, it } from "vitest";

import {
  createInquirySchema,
  updateInquiryStatusSchema,
} from "../src/validators/inquiry.validator";

describe("Create Inquiry Validation", () => {
  const validInquiry = {
    customerName: "John Silva",
    contactMethod: "PHONE" as const,
    contact: "0771234567",
    subject: "Product inquiry",
    description: "Customer wants more information about a product.",
  };

  it("should accept valid inquiry data", () => {
    const result = createInquirySchema.safeParse(validInquiry);

    expect(result.success).toBe(true);
  });

  it("should reject a customer name shorter than 2 characters", () => {
    const result = createInquirySchema.safeParse({
      ...validInquiry,
      customerName: "J",
    });

    expect(result.success).toBe(false);
  });

  it("should reject a description shorter than 10 characters", () => {
    const result = createInquirySchema.safeParse({
      ...validInquiry,
      description: "Too short",
    });

    expect(result.success).toBe(false);
  });

  it("should default confirmDuplicate to false", () => {
    const result = createInquirySchema.safeParse(validInquiry);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.confirmDuplicate).toBe(false);
    }
  });
});

describe("Update Inquiry Status Validation", () => {
  it("should accept a valid status and version", () => {
    const result = updateInquiryStatusSchema.safeParse({
      status: "IN_PROGRESS",
      version: 1,
    });

    expect(result.success).toBe(true);
  });

  it("should reject a zero version", () => {
    const result = updateInquiryStatusSchema.safeParse({
      status: "RESOLVED",
      version: 0,
    });

    expect(result.success).toBe(false);
  });
});
