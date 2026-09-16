"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { ShoppingBag, Sprout } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthSpinner } from "@/components/auth/AuthSpinner";
import { AuthDivider, GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordField } from "@/components/auth/PasswordField";
import { DarkSelect } from "@/components/ui/DarkSelect";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth/errors";
import { createUserProfile, fetchUserProfile } from "@/lib/auth/profile";
import { buildAuthCallbackUrl } from "@/lib/auth/redirect";
import { BUYER_COUNTRY_OPTIONS } from "@/lib/utils/constants";
import { getPasswordStrength } from "@/lib/utils/helpers";
import type { UserRole } from "@/lib/types/user";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "seller" ? "seller" : "buyer";

  const [role, setRole] = useState<UserRole>(initialRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [buyerCountry, setBuyerCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (searchParams.get("role") === "seller") setRole("seller");
  }, [searchParams]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const profile = await fetchUserProfile(supabase, session.user.id);
      const wantsSeller = searchParams.get("role") === "seller";
      if (profile?.role === "seller") {
        window.location.replace("/dashboard");
        return;
      }
      if (wantsSeller) {
        window.location.replace("/onboarding");
        return;
      }
      window.location.replace("/");
    });
  }, [searchParams]);

  const passwordStrength = getPasswordStrength(password);

  async function resendConfirmation(targetEmail: string) {
    setError(null);
    setInfo(null);
    setResending(true);

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail.trim(),
        options: {
          emailRedirectTo: buildAuthCallbackUrl("/login")
        }
      });

      if (resendError) {
        setError(mapAuthError(resendError.message));
        return;
      }

      setPendingConfirmEmail(targetEmail.trim());
      setInfo(
        "Confirmation email sent. Check inbox and spam. If nothing arrives within a few minutes, wait about an hour — Supabase limits how many auth emails can be sent."
      );
    } catch {
      setError("Could not resend confirmation email. Please try again.");
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (role === "buyer" && !buyerCountry) {
      setError("Please select your country");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const trimmedEmail = email.trim();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: buildAuthCallbackUrl("/login"),
        data: {
          full_name: fullName.trim(),
          role,
          ...(role === "buyer" ? { country_code: buyerCountry } : {})
        }
      }
    });

    if (signUpError) {
      setError(mapAuthError(signUpError.message));
      setSubmitting(false);
      return;
    }

    if (!data.user) {
      setError("Could not create account. Please try again.");
      setSubmitting(false);
      return;
    }

    // Supabase returns a user with empty identities when the email is already registered,
    // and does not send another confirmation email.
    const alreadyRegistered =
      Array.isArray(data.user.identities) && data.user.identities.length === 0;

    if (alreadyRegistered) {
      setPendingConfirmEmail(trimmedEmail);
      setError(null);
      setInfo(
        "This email is already registered. If you haven't confirmed it yet, resend the confirmation email below. Otherwise log in or reset your password."
      );
      setSubmitting(false);
      return;
    }

    if (!data.session) {
      setPendingConfirmEmail(trimmedEmail);
      setInfo(
        "Check your email to confirm your account, then sign in. Also check spam. If nothing arrives, use Resend below."
      );
      setSubmitting(false);
      return;
    }

    const { error: profileError } = await createUserProfile(supabase, {
      id: data.user.id,
      email: data.user.email ?? trimmedEmail,
      fullName: fullName.trim(),
      role,
      countryCode: role === "buyer" ? buyerCountry : null
    });

    if (profileError) {
      setError(mapAuthError(profileError));
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    window.location.assign(role === "seller" ? "/onboarding" : "/");
  }

  return (
    <AuthShell>
      <h1 className="font-heading text-center text-2xl font-semibold text-[var(--text-primary)]">
        Create your account
      </h1>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setRole("buyer")}
          className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition ${
            role === "buyer"
              ? "border-[#1D9E75] bg-[#1D9E7518] shadow-[0_0_0_1px_#1D9E75]"
              : "border-[var(--card-border)] bg-[color:var(--search-bg)]"
          }`}
        >
          <ShoppingBag
            size={22}
            className={role === "buyer" ? "text-[#1D9E75]" : "text-[var(--text-tertiary)]"}
          />
          <span className="text-xs font-semibold text-[var(--text-primary)]">I&apos;m a buyer</span>
        </button>
        <button
          type="button"
          onClick={() => setRole("seller")}
          className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition ${
            role === "seller"
              ? "border-[#1D9E75] bg-[#1D9E7518] shadow-[0_0_0_1px_#1D9E75]"
              : "border-[var(--card-border)] bg-[color:var(--search-bg)]"
          }`}
        >
          <Sprout
            size={22}
            className={role === "seller" ? "text-[#1D9E75]" : "text-[var(--text-tertiary)]"}
          />
          <span className="text-xs font-semibold text-[var(--text-primary)]">I&apos;m a seller</span>
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
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
          <label htmlFor="fullName" className="mb-1.5 block text-[11px] text-[var(--text-secondary)]">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            className="eden-field-input w-full rounded-xl border border-[var(--card-border)] bg-[color:var(--search-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[#1D9E75] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="reg-email" className="mb-1.5 block text-[11px] text-[var(--text-secondary)]">
            Email
          </label>
          <input
            id="reg-email"
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
          id="reg-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          showStrength
          strength={passwordStrength}
        />

        {role === "buyer" ? (
          <div>
            <label className="mb-1.5 block text-[11px] text-[var(--text-secondary)]">
              Country
            </label>
            <DarkSelect
              value={buyerCountry}
              options={BUYER_COUNTRY_OPTIONS.map((c) => ({
                value: c.value,
                label: c.label
              }))}
              onChange={setBuyerCountry}
              placeholder="Select your country"
            />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center rounded-xl bg-[#1D9E75] py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(29,158,117,0.35)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <AuthSpinner label="Creating account…" /> : "Create account"}
        </button>
      </form>

      {pendingConfirmEmail ? (
        <button
          type="button"
          disabled={resending || submitting}
          onClick={() => void resendConfirmation(pendingConfirmEmail)}
          className="mt-3 flex w-full items-center justify-center rounded-xl border border-[var(--card-border)] bg-[color:var(--search-bg)] py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resending ? <AuthSpinner label="Sending…" /> : "Resend confirmation email"}
        </button>
      ) : null}

      <AuthDivider />

      <GoogleSignInButton disabled={submitting} />

      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#1D9E75] hover:underline">
          Log in
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <AuthSpinner label="Loading…" />
        </AuthShell>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
