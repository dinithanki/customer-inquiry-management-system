"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getApiErrorMessage } from "@/lib/api";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
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
    <section className="w-full max-w-[520px] rounded-3xl border border-border bg-white p-8 shadow-[0_28px_80px_rgba(15,23,42,0.14)] max-[420px]:p-[28px_22px]" aria-labelledby="password-title">
      <h1 id="password-title" className="mb-2 text-2xl font-bold text-slate-800">Change password</h1>
      <p className="mb-[22px] text-[13px] text-muted">Your temporary password must be changed before continuing.</p>
      {serverError && <p className="text-xs text-error">{serverError}</p>}
      <form className="grid gap-4" onSubmit={handleSubmit(submit)} noValidate>
        {([
          ["currentPassword", "Current password", "current-password"],
          ["newPassword", "New password", "new-password"],
          ["confirmPassword", "Confirm new password", "new-password"],
        ] as const).map(([name, label, autoComplete]) => (
          <label key={name} className="grid gap-[7px] text-xs font-semibold text-slate-600">
            {label}
            <input className="h-[42px] w-full rounded-lg border border-border bg-white px-[11px] text-[13px] font-normal text-text" type="password" autoComplete={autoComplete} {...register(name)} />
            {errors[name] && <span className="font-normal text-error">{errors[name]?.message}</span>}
          </label>
        ))}
        <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-[14px] text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.16)] hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoadingIndicator inline label="Changing password" size="sm" />}{isSubmitting ? "Changing password..." : "Change password"}
        </button>
      </form>
    </section>
  );
}
