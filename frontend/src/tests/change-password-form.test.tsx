import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useAuthStore } from "@/store/auth.store";

const { mockReplace, mockChangePassword } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockChangePassword: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/services/auth.service", () => ({ changePassword: mockChangePassword }));

import ChangePasswordPage from "@/app/(auth)/change-password/page";

beforeEach(() => {
  useAuthStore.getState().setUser({
    id: "staff-1",
    name: "Test Staff",
    role: "STAFF",
    must_change_password: true,
  });
  useAuthStore.getState().setInitialized(true);
});

afterEach(() => {
  cleanup();
  useAuthStore.getState().clearAuth();
  vi.clearAllMocks();
});

describe("Change Password form", () => {
  it("restores the authenticated session before showing the form after a refresh", async () => {
    useAuthStore.getState().clearAuth();
    const initialize = vi.fn(async () => {
      useAuthStore.setState({
        user: { id: "staff-1", name: "Test Staff", role: "STAFF", must_change_password: true },
        isAuthenticated: true,
        isInitialized: true,
      });
    });
    useAuthStore.setState({ initialize });

    render(<ChangePasswordPage />);

    expect(await screen.findByLabelText("Current password")).toHaveValue("");
    expect(initialize).toHaveBeenCalledOnce();
  });

  it("opens with empty password fields and disables browser autofill", () => {
    const { container } = render(<ChangePasswordPage />);

    for (const label of ["Current password", "New password", "Confirm new password"]) {
      expect(screen.getByLabelText(label)).toHaveValue("");
      expect(screen.getByLabelText(label)).toHaveAttribute("autocomplete", "off");
    }
    expect(container.querySelector("form")).toHaveAttribute("autocomplete", "off");
  });

  it("changes the password and clears all fields on success", async () => {
    mockChangePassword.mockResolvedValue({ success: true, message: "Password changed" });
    render(<ChangePasswordPage />);

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "Temporary123!" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "NewPassword123!" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "NewPassword123!" } });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/dashboard"));
    expect(mockChangePassword).toHaveBeenCalledWith({
      currentPassword: "Temporary123!",
      newPassword: "NewPassword123!",
      confirmPassword: "NewPassword123!",
    });
    for (const label of ["Current password", "New password", "Confirm new password"]) {
      expect(screen.getByLabelText(label)).toHaveValue("");
    }
    expect(useAuthStore.getState().user?.must_change_password).toBe(false);
  });
});
