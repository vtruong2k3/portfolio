"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@/hooks/mutations/use-login";
import { useAuthStore } from "@/store/auth.store";
import { getApiErrorMessage } from "@/lib/axios";

const loginSchema = z.object({
  email:    z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const token  = useAuthStore((s) => s.token);
  const login  = useLogin();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // Already authenticated → redirect to admin dashboard
  useEffect(() => {
    if (token) router.replace("/admin");
  }, [token, router]);

  async function onSubmit(data: LoginForm) {
    await login.mutateAsync(data);
    router.replace("/admin");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4" aria-hidden="true">
            <span className="text-2xl">⬡</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Login</h1>
          <p className="text-muted text-sm mt-1">Sign in to manage your portfolio</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="glass rounded-2xl p-8 border border-border flex flex-col gap-5"
          aria-label="Admin login form"
          noValidate
        >
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              className="input-base"
              placeholder="admin@portfolio.local"
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="email-error" className="text-xs text-red-400" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              className="input-base"
              placeholder="••••••••"
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            {errors.password && (
              <p id="password-error" className="text-xs text-red-400" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* API error */}
          {login.isError && (
            <p className="text-sm text-red-400 text-center" role="alert">
              {getApiErrorMessage(login.error)}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={login.isPending}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-background font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
            aria-busy={login.isPending}
          >
            {login.isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" aria-hidden="true" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-6">
          <a href="/" className="hover:text-primary transition-colors duration-200">
            ← Back to Portfolio
          </a>
        </p>
      </div>
    </div>
  );
}
