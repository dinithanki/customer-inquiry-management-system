"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Inbox, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
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
      <aside className="login-showcase" aria-label="Inquiry Desk staff portal">
        <div className="login-brand">
          <span className="login-brand-mark"><Inbox size={20} aria-hidden="true" /></span>
          <span><strong>Inquiry Desk</strong><small>Customer support workspace</small></span>
        </div>
        <div className="login-showcase-copy">
          <span className="login-kicker"><span /> STAFF PORTAL</span>
          <h2>Every conversation, moving forward.</h2>
          <p>Keep customer inquiries organized and help your team deliver thoughtful support.</p>
          <div className="login-showcase-note"><ShieldCheck size={18} aria-hidden="true" /><span>Secure access for your team</span></div>
        </div>
        <span className="login-showcase-footer">CUSTOMER INQUIRY MANAGEMENT</span>
      </aside>

      <div className="login-form-panel">
        <div className="login-brand login-brand-mobile">
          <span className="login-brand-mark"><Inbox size={20} aria-hidden="true" /></span>
          <span><strong>Inquiry Desk</strong><small>Customer support workspace</small></span>
        </div>

        <div className="login-form-heading">
          <span className="login-welcome">Welcome back</span>
          <h1 id="login-title">Sign in to your account</h1>
          <p>Enter your staff credentials to continue.</p>
        </div>

        {serverError && <div className="login-error-banner" role="alert">{serverError}</div>}

        <form className="login-form" onSubmit={handleSubmit(submit)} noValidate>
          <div className="login-field">
            <label htmlFor="login-email">Email address</label>
            <div className="login-input-wrap">
              <Mail size={18} aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "login-email-error" : undefined}
                {...register("email")}
              />
            </div>
            {errors.email && <span className="login-field-error" id="login-email-error">{errors.email.message}</span>}
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="login-input-wrap">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "login-password-error" : undefined}
                {...register("password")}
              />
              <button
                className="login-password-toggle"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
            </div>
            {errors.password && <span className="login-field-error" id="login-password-error">{errors.password.message}</span>}
          </div>

          <button className="login-submit-button" type="submit" disabled={isSubmitting}>
            <span>{isSubmitting ? "Signing in..." : "Sign in"}</span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </form>

        <div className="login-security-note"><ShieldCheck size={16} aria-hidden="true" /><span>Secure sign-in for authorized staff</span></div>
      </div>
    </section>
  );
}
