"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Inbox, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
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
    <section className="grid min-h-[620px] w-full max-w-[1040px] grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] overflow-hidden rounded-3xl border border-border bg-white shadow-[0_28px_80px_rgba(15,23,42,0.14)] max-[760px]:max-w-[520px] max-[760px]:min-h-0 max-[760px]:grid-cols-1 max-[760px]:rounded-[20px] max-[420px]:rounded-2xl" aria-labelledby="login-title">
      <aside className="relative flex min-h-[620px] flex-col justify-between overflow-hidden bg-[linear-gradient(145deg,#172554_0%,#1e3a8a_55%,#1d4ed8_100%)] p-[42px] text-white before:absolute before:top-[150px] before:-right-[190px] before:size-[440px] before:rounded-full before:border before:border-white/10 before:shadow-[0_0_0_42px_rgba(255,255,255,0.025),0_0_0_84px_rgba(255,255,255,0.02)] before:content-[''] before:pointer-events-none after:absolute after:right-[46px] after:bottom-[60px] after:size-40 after:rounded-full after:bg-blue-400/10 after:blur-[1px] after:content-[''] after:pointer-events-none max-[760px]:hidden" aria-label="Inquiry Desk staff portal">
        <div className="relative z-[1] flex items-center gap-3">
          <span className="grid size-[42px] shrink-0 place-items-center rounded-[13px] border border-white/20 bg-white/10 text-white"><Inbox size={20} aria-hidden="true" /></span>
          <span className="grid gap-[3px]"><strong className="text-[15px] tracking-[-0.02em]">Inquiry Desk</strong><small className="text-[10px] text-blue-200">Customer support workspace</small></span>
        </div>
        <div className="relative z-[1] my-10 max-w-[390px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/25 bg-white/[0.07] px-2.5 py-[7px] text-[9px] font-bold tracking-[0.12em] text-blue-100 before:size-1.5 before:rounded-full before:bg-blue-400 before:shadow-[0_0_0_4px_rgba(96,165,250,0.16)] before:content-['']">STAFF PORTAL</span>
          <h2 className="mt-6 mb-3 max-w-[360px] text-[clamp(30px,3.4vw,42px)] leading-[1.12] font-bold tracking-[-0.045em]">Every conversation, moving forward.</h2>
          <p className="m-0 max-w-[340px] text-sm leading-[1.75] text-slate-300">Keep customer inquiries organized and help your team deliver thoughtful support.</p>
          <div className="mt-8 flex items-center gap-[9px] text-[11px] font-semibold text-blue-100"><ShieldCheck className="text-blue-300" size={18} aria-hidden="true" /><span>Secure access for your team</span></div>
        </div>
        <span className="relative z-[1] text-[9px] font-bold tracking-[0.14em] text-[#93a6cd]">CUSTOMER INQUIRY MANAGEMENT</span>
      </aside>

      <div className="flex flex-col justify-center px-[clamp(36px,6.3vw,78px)] py-16 max-[760px]:p-[42px] max-[420px]:px-[22px] max-[420px]:py-7">
        <div className="mb-[42px] hidden items-center gap-3 max-[760px]:mb-[42px] max-[760px]:flex max-[420px]:mb-[34px]">
          <span className="grid size-[42px] shrink-0 place-items-center rounded-[13px] border border-blue-100 bg-blue-50 text-primary"><Inbox size={20} aria-hidden="true" /></span>
          <span className="grid gap-[3px]"><strong className="text-[15px] tracking-[-0.02em] text-slate-800">Inquiry Desk</strong><small className="text-[10px] text-muted">Customer support workspace</small></span>
        </div>

        <div className="mb-[30px] max-[420px]:mb-[26px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary">Welcome back</span>
          <h1 id="login-title" className="mt-2.5 mb-2 text-[clamp(26px,3vw,32px)] leading-[1.2] font-bold tracking-[-0.04em] text-sidebar">Sign in to your account</h1>
          <p className="m-0 text-[13px] leading-[1.6] text-muted">Enter your staff credentials to continue.</p>
        </div>

        {serverError && <div className="mb-5 -mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-[11px] text-xs leading-[1.5] text-red-700" role="alert">{serverError}</div>}

        <form className="grid gap-5" onSubmit={handleSubmit(submit)} noValidate>
          <div className="grid min-w-0 gap-2">
            <label className="text-xs font-semibold text-slate-700" htmlFor="login-email">Email address</label>
            <div className="flex min-h-12 items-center gap-[11px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 transition-[border-color,box-shadow,background,color] duration-150 focus-within:border-blue-400 focus-within:bg-white focus-within:text-primary focus-within:shadow-[0_0_0_4px_rgba(37,99,235,0.1)] [&:has(input[aria-invalid=true])]:border-red-300">
              <Mail className="shrink-0" size={18} aria-hidden="true" />
              <input
                className="h-[46px] w-full min-w-0 border-0 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
                id="login-email"
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                aria-required="true"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "login-email-error" : undefined}
                {...register("email")}
              />
            </div>
            {errors.email && <span className="text-[11px] text-red-700" id="login-email-error">{errors.email.message}</span>}
          </div>

          <div className="grid min-w-0 gap-2">
            <label className="text-xs font-semibold text-slate-700" htmlFor="login-password">Password</label>
            <div className="flex min-h-12 items-center gap-[11px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 transition-[border-color,box-shadow,background,color] duration-150 focus-within:border-blue-400 focus-within:bg-white focus-within:text-primary focus-within:shadow-[0_0_0_4px_rgba(37,99,235,0.1)] [&:has(input[aria-invalid=true])]:border-red-300">
              <LockKeyhole className="shrink-0" size={18} aria-hidden="true" />
              <input
                className="h-[46px] w-full min-w-0 border-0 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                aria-required="true"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "login-password-error" : undefined}
                {...register("password")}
              />
              <button
                className="grid size-[34px] shrink-0 place-items-center rounded-lg border-0 bg-transparent text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
            </div>
            {errors.password && <span className="text-[11px] text-red-700" id="login-password-error">{errors.password.message}</span>}
          </div>

          <button className="group mt-1 flex min-h-12 items-center justify-between rounded-xl border-0 bg-[linear-gradient(100deg,#2563eb,#1d4ed8)] px-4 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(37,99,235,0.2)] transition-[transform,box-shadow,background] duration-150 hover:not-disabled:-translate-y-px hover:not-disabled:bg-[linear-gradient(100deg,#1d4ed8,#1e40af)] hover:not-disabled:shadow-[0_11px_22px_rgba(37,99,235,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-wait disabled:opacity-[0.72]" type="submit" disabled={isSubmitting}>
            <span className="flex-1 text-center">{isSubmitting ? "Signing in..." : "Sign in"}</span>
            <span className="grid size-8 place-items-center rounded-lg bg-white/15 transition-colors group-hover:bg-white/25">
              {isSubmitting ? <LoadingIndicator inline label="Signing in" size="sm" /> : <ArrowRight size={17} aria-hidden="true" />}
            </span>
          </button>
        </form>

        <div className="mt-7 flex items-center gap-2 border-t border-slate-100 pt-[18px] text-[10px] text-muted"><ShieldCheck className="text-primary" size={16} aria-hidden="true" /><span>Secure sign-in for authorized staff</span></div>
      </div>
    </section>
  );
}
