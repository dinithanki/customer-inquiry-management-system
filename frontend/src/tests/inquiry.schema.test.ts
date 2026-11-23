import { describe, expect, it } from "vitest";
import { inquirySchema } from "@/schemas/inquiry.schema";

describe("inquirySchema", () => {
  it("accepts a valid inquiry", () => {
    const result = inquirySchema.safeParse({
      customerName: "John Silva",
      contactMethod: "EMAIL",
      contact: "john@example.com",
      subject: "Delivery status",
      description: "I would like to know the delivery status.",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid required fields", () => {
    const result = inquirySchema.safeParse({
      customerName: "A",
      contactMethod: "PHONE",
      contact: "",
      subject: "x",
      description: "short",
    });

    expect(result.success).toBe(false);
  });
});
