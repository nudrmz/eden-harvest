"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthSpinner } from "@/components/auth/AuthSpinner";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth/errors";
import { buildAuthCallbackUrl } from "@/lib/auth/redirect";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const supabase = createClient();
      const redirectTo = buildAuthCallbackUrl("/reset-password");

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo }
      );

      if (resetError) {
        setError(mapAuthError(resetError.message));
        setSubmitting(false);
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="font-heading text-center text-2xl font-semibold text-[var(--text-primary)]">
        Reset password
      </h1>
      <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
        Enter your email and we&apos;ll send you a link to choose a new password.
      </p>

      {sent ? (
        <div className="mt-8 space-y-4">
          <p className="rounded-xl border border-[#1D9E7540] bg-[#1D9E7518] px-3 py-2.5 text-sm text-[#5DCAA5]">
            If an account exists for <strong>{email.trim()}</strong>, you&apos;ll
            receive a password reset link shortly. Check your inbox and spam folder.
          </p>
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-xl bg-[#1D9E75] py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(29,158,117,0.35)] transition hover:opacity-95"
          >
            Back to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-[#F0959540] bg-[#F0959518] px-3 py-2.5 text-sm text-[#F09595]"
            >
              {error}
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

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-xl bg-[#1D9E75] py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(29,158,117,0.35)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <AuthSpinner label="Sending…" /> : "Send reset link"}
          </button>
        </form>
      )}

      {!sent ? (
        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Remember your password?{" "}
          <Link href="/login" className="font-semibold text-[#1D9E75] hover:underline">
            Log in
          </Link>
        </p>
      ) : null}
    </AuthShell>
  );
}
