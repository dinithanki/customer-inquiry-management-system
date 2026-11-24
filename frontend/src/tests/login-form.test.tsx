import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { mockReplace, mockLogin } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockLogin: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/services/auth.service", () => ({ login: mockLogin }));

import LoginPage from "@/app/(auth)/login/page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Login form", () => {
  it("starts with empty credentials and discourages browser credential restoration", () => {
    const { container } = render(<LoginPage />);

    expect(screen.getByLabelText("Email address")).toHaveValue("");
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.getByLabelText("Email address")).toHaveAttribute("autocomplete", "off");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
    expect(container.querySelector("form")).toHaveAttribute("autocomplete", "off");
  });

  it("still signs in and clears submitted credentials", async () => {
    mockLogin.mockResolvedValue({
      id: "staff-1",
      name: "Test Staff",
      role: "STAFF",
      must_change_password: false,
    });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "staff@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "ValidPassword123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/dashboard"));
    expect(mockLogin).toHaveBeenCalledWith("staff@example.com", "ValidPassword123!");
    expect(screen.getByLabelText("Email address")).toHaveValue("");
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });
});
