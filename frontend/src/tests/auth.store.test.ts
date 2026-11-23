import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth.store";

describe("auth store", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("tracks an authenticated user and clears it on logout", () => {
    useAuthStore.getState().setUser({
      id: "staff-1",
      name: "Test Staff",
      role: "STAFF",
      must_change_password: false,
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.role).toBe("STAFF");

    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
