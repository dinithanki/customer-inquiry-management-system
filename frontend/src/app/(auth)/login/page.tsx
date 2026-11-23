"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getApiErrorMessage } from "@/lib/api";
import { login } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";

const loginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const submit = async (values: LoginValues) => {
    setServerError("");
    try {
      const user = await login(values.email, values.password);
      setUser(user);
      setInitialized(true);
      router.replace(user.must_change_password ? "/change-password" : "/dashboard");
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    }
  };

  return (
    <section className="login-card" aria-labelledby="login-title">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="brand-mark">I</span>
        <strong style={{ color: "#1e293b", fontSize: 16 }}>Inquiry Desk</strong>
      </div>
      <div style={{ margin: "32px 0 22px" }}>
        <h1 id="login-title" style={{ margin: "0 0 8px", color: "#1e293b", fontSize: 26 }}>Sign in</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Use your staff account to continue.</p>
      </div>
      {serverError && <p className="error-state" style={{ minHeight: "auto", color: "#dc2626", marginBottom: 14 }}>{serverError}</p>}
      <form className="form-stack" onSubmit={handleSubmit(submit)} noValidate>
        <label style={{ display: "grid", gap: 7, color: "#475569", fontSize: 12, fontWeight: 600 }}>
          Email
          <input className="form-input" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <span style={{ color: "#dc2626", fontWeight: 400 }}>{errors.email.message}</span>}
        </label>
        <label style={{ display: "grid", gap: 7, color: "#475569", fontSize: 12, fontWeight: 600 }}>
          Password
          <input className="form-input" type="password" autoComplete="current-password" {...register("password")} />
          {errors.password && <span style={{ color: "#dc2626", fontWeight: 400 }}>{errors.password.message}</span>}
        </label>
        <button className="button button-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}
