"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { FarmLogoAvatar } from "@/components/ui/FarmLogoAvatar";
import { useAuth } from "@/lib/supabase/hooks";
import { formatTrialEnd, trialDaysLeft } from "@/lib/access/trial";
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

interface ProfileActionRowProps {
  label: string;
  onClick: () => void;
  busy?: boolean;
  goldArrow?: boolean;
}

/** Same look as ProfileRow, but for an action that needs a round trip (opening
 * a Stripe portal session) before it has somewhere to send the browser —
 * a plain href can't do that. */
function ProfileActionRow({ label, onClick, busy = false, goldArrow = false }: ProfileActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center justify-between border-b border-[rgba(255,255,255,0.08)] py-3.5 text-left last:border-b-0 disabled:opacity-60"
    >
      <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
      <ChevronRight
        size={18}
        className={goldArrow ? "text-eden-gold" : "text-[var(--text-tertiary)]"}
      />
    </button>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, isVerifiedAccess, isSeller, signOut, access } = useAuth();
  // Paid (or admin) shows "Verified Access"; a buyer's free trial gets its own badge.
  const onTrial = !isSeller && access?.reason === "trial";
  const fullAccess = isVerifiedAccess && !onTrial;
  const trialDays = onTrial ? trialDaysLeft(access?.trialEndsAt ?? null) : 0;
  const [isAdmin, setIsAdmin] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/admin/me");
        const payload = (await response.json()) as { isAdmin?: boolean };
        if (!cancelled) setIsAdmin(Boolean(payload.isAdmin));
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  function openDeleteDialog() {
    setDeleteConfirm("");
    setDeleteError(null);
    setDeleteOpen(true);
  }

  async function handleDeleteAccount() {
    if (deleting || deleteConfirm.trim().toUpperCase() !== "DELETE") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: deleteConfirm })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setDeleteError(payload?.error ?? "Could not delete your account. Please try again.");
        setDeleting(false);
        return;
      }
      await signOut().catch(() => undefined);
      router.replace("/?accountDeleted=1");
      router.refresh();
    } catch {
      setDeleteError("Could not reach the server. Check your connection and try again.");
      setDeleting(false);
    }
  }

  async function handleManageSubscription() {
    setManagingSubscription(true);
    setPortalError(null);

    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        setPortalError(payload.error ?? "Could not open billing portal.");
        setManagingSubscription(false);
        return;
      }

      window.location.href = payload.url;
    } catch {
      setPortalError("Could not open billing portal. Check your connection and try again.");
      setManagingSubscription(false);
    }
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
              className={`mt-3 rounded-full px-3 py-1 text-[length:calc(11px*var(--fs-small))] font-semibold uppercase tracking-wide ${
                fullAccess || onTrial
                  ? "border border-eden-gold/40 bg-eden-gold/15 text-eden-gold"
                  : isSeller
                    ? "border border-[#1D9E75]/50 bg-[#1D9E75]/15 text-[#1D9E75]"
                    : "border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)]"
              }`}
            >
              {fullAccess
                ? "Verified Access"
                : isSeller
                  ? "Seller"
                  : onTrial
                    ? `Free trial · ${trialDays} ${trialDays === 1 ? "day" : "days"} left`
                    : "Free"}
            </span>
            {onTrial && access?.trialEndsAt ? (
              <p className="mt-2 max-w-xs text-xs text-[var(--text-secondary)]">
                Full Verified Access until {formatTrialEnd(access.trialEndsAt)}. Subscribe any time to
                keep messaging sellers after that.
              </p>
            ) : null}
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">
              Member since {formatMemberSince(user.created_at)}
            </p>
          </div>

          <section className="mt-8">
            <p className="mb-2 px-1 text-[length:calc(11px*var(--fs-small))] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Account
            </p>
            <div className="glass-card px-4">
              <ProfileRow label="Edit profile" href="/settings#profile" />
              <ProfileRow label="Notification preferences" href="/settings#notifications" />
              {/* Selling is free: sellers never see upgrade prompts. Anyone who
                  does have a subscription can still manage it. */}
              {access?.paid ? (
                <ProfileActionRow
                  label={managingSubscription ? "Opening billing portal…" : "Manage subscription"}
                  onClick={() => void handleManageSubscription()}
                  busy={managingSubscription}
                  goldArrow
                />
              ) : !isSeller && access?.reason !== "admin" ? (
                <ProfileRow
                  label={onTrial ? "Subscribe to Verified Access" : "Upgrade to Verified Access"}
                  href="/upgrade"
                  goldArrow
                />
              ) : null}
            </div>
            {portalError ? (
              <p className="mt-2 px-1 text-[length:calc(11px*var(--fs-small))] text-[#F09595]">{portalError}</p>
            ) : null}
          </section>

          {isAdmin ? (
            <section className="mt-6">
              <p className="mb-2 px-1 text-[length:calc(11px*var(--fs-small))] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Admin
              </p>
              <div className="glass-card px-4">
                <ProfileRow label="Seller verification" href="/admin/verifications" goldArrow />
                <ProfileRow label="Campaign links & QR codes" href="/admin/campaigns" goldArrow />
                <ProfileRow label="Sellers (retire a farm)" href="/admin/sellers" goldArrow />
                <ProfileRow label="Look up a user" href="/admin/users" goldArrow />
              </div>
            </section>
          ) : null}

          <section className="mt-6">
            <p className="mb-2 px-1 text-[length:calc(11px*var(--fs-small))] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Support
            </p>
            <div className="glass-card px-4">
              <ProfileRow label="Help & FAQ" href="/support" />
              <ProfileRow label="Contact us" href="/support" />
              <ProfileRow label="Privacy Policy" href="/privacy" />
              <ProfileRow label="Terms of Service" href="/terms" />
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
              onClick={openDeleteDialog}
              className="mt-3 w-full text-center text-[length:calc(11px*var(--fs-small))] text-[var(--text-tertiary)] underline-offset-2 hover:underline"
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

      {deleteOpen && user ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--app-bg)] p-5">
            <h2 id="delete-account-title" className="text-base font-semibold text-[var(--text-primary)]">
              Delete your account?
            </h2>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              This is permanent and can&apos;t be undone. We will delete:
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-[var(--text-secondary)]">
              <li>• Your sign-in, name, email and settings</li>
              <li>• Your farm profile, listings and photos, if you&apos;re a seller</li>
              <li>• All your chats and messages, for you and the people you talked to</li>
              <li>• Your enquiries, plus reviews you wrote or received</li>
              {access?.paid ? (
                <li>
                  •{" "}
                  <strong className="text-[var(--text-primary)]">
                    Your Verified Access subscription is cancelled straight away
                  </strong>
                  , with no refund for the rest of the current period
                </li>
              ) : null}
            </ul>
            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              You can sign up again later with the same email, but you&apos;ll start from scratch.
            </p>
            <label htmlFor="delete-confirm" className="mt-4 block text-xs text-[var(--text-secondary)]">
              Type <strong className="text-[var(--text-primary)]">DELETE</strong> to confirm
            </label>
            <input
              id="delete-confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              className="eden-field-input mt-1.5"
              placeholder="DELETE"
            />
            {deleteError ? <p className="mt-2 text-xs text-[#E5484D]">{deleteError}</p> : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-[var(--card-border)] py-2.5 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                disabled={deleting || deleteConfirm.trim().toUpperCase() !== "DELETE"}
                className="flex-1 rounded-xl bg-[#E5484D] py-2.5 text-sm font-semibold text-[#ffffff] disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <MobileBottomNav active="profile" />
    </main>
  );
}
