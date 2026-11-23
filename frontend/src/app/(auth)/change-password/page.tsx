"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getApiErrorMessage } from "@/lib/api";
import { changePassword } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must contain at least 8 characters").max(72),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((value) => value.currentPassword !== value.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

type PasswordValues = z.infer<typeof passwordSchema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [router, user]);

  const submit = async (values: PasswordValues) => {
    setServerError("");
    try {
      await changePassword(values);
      if (user) setUser({ ...user, must_change_password: false });
      router.replace("/dashboard");
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    }
  };

  return (
    <section className="login-card" aria-labelledby="password-title">
      <h1 id="password-title" style={{ margin: "0 0 8px", color: "#1e293b", fontSize: 24 }}>Change password</h1>
      <p style={{ margin: "0 0 22px", color: "#64748b", fontSize: 13 }}>Your temporary password must be changed before continuing.</p>
      {serverError && <p style={{ color: "#dc2626", fontSize: 12 }}>{serverError}</p>}
      <form className="form-stack" onSubmit={handleSubmit(submit)} noValidate>
        {([
          ["currentPassword", "Current password", "current-password"],
          ["newPassword", "New password", "new-password"],
          ["confirmPassword", "Confirm new password", "new-password"],
        ] as const).map(([name, label, autoComplete]) => (
          <label key={name} style={{ display: "grid", gap: 7, color: "#475569", fontSize: 12, fontWeight: 600 }}>
            {label}
            <input className="form-input" type="password" autoComplete={autoComplete} {...register(name)} />
            {errors[name] && <span style={{ color: "#dc2626", fontWeight: 400 }}>{errors[name]?.message}</span>}
          </label>
        ))}
        <button className="button button-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Changing password..." : "Change password"}
        </button>
      </form>
    </section>
  );
}
