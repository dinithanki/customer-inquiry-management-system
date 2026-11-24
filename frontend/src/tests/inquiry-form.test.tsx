
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { mockPush, mockBack, mockCheckDuplicates, mockCreateInquiry } =
  vi.hoisted(() => ({
    mockPush: vi.fn(),
    mockBack: vi.fn(),
    mockCheckDuplicates: vi.fn(),
    mockCreateInquiry: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

vi.mock("@/services/inquiry.service", () => ({
  checkDuplicateInquiries: mockCheckDuplicates,
  createInquiry: mockCreateInquiry,
}));

import NewInquiryPage from "@/app/(dashboard)/inquiries/new/page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("New Inquiry Form", () => {
  it("shows validation errors when submitted empty", async () => {
    render(<NewInquiryPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Create Inquiry" })
    );

    expect(
      await screen.findByText(/customerName|customer name/i)
    ).toBeInTheDocument();

    expect(mockCheckDuplicates).not.toHaveBeenCalled();
    expect(mockCreateInquiry).not.toHaveBeenCalled();
  });

  it("does not submit invalid inquiry information", async () => {
    render(<NewInquiryPage />);

    fireEvent.change(screen.getByLabelText("Customer name"), {
      target: { value: "A" },
    });

    fireEvent.change(screen.getByLabelText("Contact information"), {
      target: { value: "12" },
    });

    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Hi" },
    });

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Short" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Create Inquiry" })
    );

    await waitFor(() => {
      expect(mockCheckDuplicates).not.toHaveBeenCalled();
      expect(mockCreateInquiry).not.toHaveBeenCalled();
    });
  });

  it("creates an inquiry when valid information is submitted", async () => {
    mockCheckDuplicates.mockResolvedValue({
      hasDuplicates: false,
      data: [],
    });

    mockCreateInquiry.mockResolvedValue({
      success: true,
    });

    render(<NewInquiryPage />);

    fireEvent.change(screen.getByLabelText("Customer name"), {
      target: { value: "John Silva" },
    });

    fireEvent.change(screen.getByLabelText("Contact information"), {
      target: { value: "0771234567" },
    });

    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Product inquiry" },
    });

    fireEvent.change(screen.getByLabelText("Description"), {
      target: {
        value: "Customer wants information about a product.",
      },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Create Inquiry" })
    );

    await waitFor(() => {
      expect(mockCheckDuplicates).toHaveBeenCalledWith(
        "0771234567",
        "PHONE"
      );

      expect(mockCreateInquiry).toHaveBeenCalledWith({
        customerName: "John Silva",
        contactMethod: "PHONE",
        contact: "0771234567",
        subject: "Product inquiry",
        description: "Customer wants information about a product.",
        confirmDuplicate: false,
      });

      expect(mockPush).toHaveBeenCalledWith("/inquiries");
    });
  });
});
