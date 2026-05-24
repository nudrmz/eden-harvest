"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { FarmLogoAvatar } from "@/components/ui/FarmLogoAvatar";
import { useAuth } from "@/lib/supabase/hooks";
import { getInitials } from "@/lib/utils/helpers";

function formatMemberSince(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric"
  });
}

interface ProfileRowProps {
  label: string;
  href: string;
  goldArrow?: boolean;
}

function ProfileRow({ label, href, goldArrow = false }: ProfileRowProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] py-3.5 last:border-b-0"
    >
      <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
      <ChevronRight
        size={18}
        className={goldArrow ? "text-eden-gold" : "text-[var(--text-tertiary)]"}
      />
    </Link>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, isVerifiedAccess, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md pb-28">
      <header className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--glass-bg)] px-4 pb-4 pt-5 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h1 className="eden-section-title text-[var(--text-primary)]">My Profile</h1>
          <ThemeToggle />
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center px-4 pt-12 text-center">
          <div className="h-[72px] w-[72px] animate-pulse rounded-full bg-[#1D9E75]/30" />
          <p className="mt-6 text-sm text-[var(--text-secondary)]">Loading profile…</p>
        </div>
      ) : user ? (
        <div className="px-4 pt-6">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#1D9E75] text-2xl font-bold text-white">
              {getInitials(user.full_name)}
            </span>
            <p className="mt-4 font-heading text-lg font-bold text-[var(--text-primary)]">
              {user.full_name ?? "Eden Harvest member"}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{user.email}</p>
            <span
              className={`mt-3 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                isVerifiedAccess
                  ? "border border-eden-gold/40 bg-eden-gold/15 text-eden-gold"
                  : "border border-white/15 bg-white/10 text-white/70"
              }`}
            >
              {isVerifiedAccess ? "Verified Access" : "Free"}
            </span>
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">
              Member since {formatMemberSince(user.created_at)}
            </p>
          </div>

          <section className="mt-8">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Account
            </p>
            <div className="glass-card px-4">
              <ProfileRow label="Edit profile" href="/settings" />
              <ProfileRow label="Notification preferences" href="/settings" />
              {!isVerifiedAccess ? (
                <ProfileRow label="Upgrade to Verified Access" href="/upgrade" goldArrow />
              ) : null}
            </div>
          </section>

          <section className="mt-6">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Support
            </p>
            <div className="glass-card px-4">
              <ProfileRow label="Help & FAQ" href="/settings" />
              <ProfileRow label="Contact us" href="/settings" />
              <ProfileRow label="Privacy Policy" href="/settings" />
              <ProfileRow label="Terms of Service" href="/settings" />
            </div>
          </section>

          <section className="mt-8">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="w-full rounded-xl py-3 text-sm font-semibold text-[#F09595] transition hover:brightness-110"
              style={{
                background: "rgba(226,75,74,0.15)",
                border: "1px solid rgba(226,75,74,0.4)"
              }}
            >
              Sign out
            </button>
            <button
              type="button"
              className="mt-3 w-full text-center text-[11px] text-[var(--text-tertiary)] underline-offset-2 hover:underline"
            >
              Delete account
            </button>
          </section>
        </div>
      ) : (
        <div className="flex flex-col items-center px-4 pt-12 text-center">
          <FarmLogoAvatar size={100} priority />
          <p className="mt-6 text-sm font-medium text-[var(--text-secondary)]">
            Sign in to access your profile
          </p>
          <Link
            href="/login"
            className="eden-btn-primary-solid mt-6 w-full max-w-xs rounded-xl bg-[#1D9E75] py-3 text-center text-base font-semibold text-white shadow-[0_10px_28px_rgba(29,158,117,0.38)]"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="mt-4 text-sm font-medium text-[#1D9E75] underline-offset-2 hover:underline"
          >
            Create an account
          </Link>
        </div>
      )}

      <MobileBottomNav active="profile" />
    </main>
  );
}
