"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthSpinner } from "@/components/auth/AuthSpinner";
import { PasswordField } from "@/components/auth/PasswordField";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth/errors";
import { getPasswordStrength } from "@/lib/utils/helpers";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function verifySession() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session?.user) {
        setReady(true);
        setChecking(false);
        return;
      }

      setError(
        "This reset link is invalid or has expired. Request a new one from the login page."
      );
      setReady(false);
      setChecking(false);
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || (session?.user && event === "SIGNED_IN")) {
        setReady(true);
        setChecking(false);
        setError(null);
      }
    });

    void verifySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(mapAuthError(updateError.message));
        setSubmitting(false);
        return;
      }

      setDone(true);
      setSubmitting(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="font-heading text-center text-2xl font-semibold text-[var(--text-primary)]">
        Choose a new password
      </h1>
      <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
        Enter a new password for your Eden Harvest account.
      </p>

      {checking ? (
        <div className="mt-10 flex justify-center">
          <AuthSpinner label="Verifying reset link…" />
        </div>
      ) : done ? (
        <div className="mt-8 space-y-4">
          <p className="rounded-xl border border-[#1D9E7540] bg-[#1D9E7518] px-3 py-2.5 text-sm text-[#5DCAA5]">
            Your password has been updated. You can now log in with your new password.
          </p>
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-xl bg-[#1D9E75] py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(29,158,117,0.35)] transition hover:opacity-95"
          >
            Continue to log in
          </Link>
        </div>
      ) : !ready ? (
        <div className="mt-8 space-y-4">
          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-[#F0959540] bg-[#F0959518] px-3 py-2.5 text-sm text-[#F09595]"
            >
              {error}
            </p>
          ) : null}
          <Link
            href="/forgot-password"
            className="flex w-full items-center justify-center rounded-xl bg-[#1D9E75] py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(29,158,117,0.35)] transition hover:opacity-95"
          >
            Request a new link
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

          <PasswordField
            id="password"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            showStrength
            strength={passwordStrength}
          />

          <PasswordField
            id="confirmPassword"
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-xl bg-[#1D9E75] py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(29,158,117,0.35)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <AuthSpinner label="Updating…" /> : "Update password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
