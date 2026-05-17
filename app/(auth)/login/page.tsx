"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthSpinner } from "@/components/auth/AuthSpinner";
import { AuthDivider, GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordField } from "@/components/auth/PasswordField";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth/errors";
import { ensureUserProfile } from "@/lib/auth/profile";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (signInError) {
      setError(mapAuthError(signInError.message));
      setSubmitting(false);
      return;
    }

    if (!data.user) {
      setError("Could not sign in. Please try again.");
      setSubmitting(false);
      return;
    }

    const { profile, error: profileError } = await ensureUserProfile(supabase, data.user);

    if (profileError || !profile) {
      setError(
        profileError
          ? mapAuthError(profileError)
          : "Could not set up your account. Please try again or contact support."
      );
      setSubmitting(false);
      return;
    }

    const destination =
      redirectTo && redirectTo.startsWith("/")
        ? redirectTo
        : profile.role === "seller"
          ? "/dashboard"
          : "/";

    router.push(destination);
    router.refresh();
  }

  return (
    <AuthShell>
      <h1 className="font-heading text-center text-2xl font-semibold text-[var(--text-primary)]">
        Welcome back
      </h1>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-[#F0959540] bg-[#F0959518] px-3 py-2.5 text-sm text-[#F09595]"
          >
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="rounded-xl border border-[#1D9E7540] bg-[#1D9E7518] px-3 py-2.5 text-sm text-[#5DCAA5]">
            {info}
          </p>
        ) : null}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-[11px] text-[var(--text-secondary)]">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="eden-field-input w-full rounded-xl border border-[var(--card-border)] bg-[color:var(--search-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[#1D9E75] focus:outline-none"
          />
        </div>

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center rounded-xl bg-[#1D9E75] py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(29,158,117,0.35)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <AuthSpinner label="Signing in…" /> : "Log in"}
        </button>
      </form>

      <AuthDivider />

      <GoogleSignInButton
        disabled={submitting}
        onClick={() => setInfo("Google sign-in will be available soon.")}
      />

      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-[#1D9E75] hover:underline">
          Sign up
        </Link>
      </p>

      <p className="mt-3 text-center text-sm">
        <Link
          href="/register?role=seller"
          className="font-medium text-eden-gold hover:underline"
        >
          I&apos;m a seller
        </Link>
      </p>

      <p className="mt-8 text-center text-[10px] leading-relaxed text-[var(--text-tertiary)]">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthShell><AuthSpinner label="Loading…" /></AuthShell>}>
      <LoginForm />
    </Suspense>
  );
}
