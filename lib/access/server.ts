import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";
import { getStripeServerClient } from "@/lib/stripe/server";
import { trialEndsAt } from "@/lib/access/trial";

/**
 * The one place that decides whether someone has Verified Access.
 *
 * It never trusts public.users.membership_tier: users can edit their own row
 * there. Instead it reads the account's app_metadata, which only the server
 * (service role) can write:
 *   va_paid: true while a Stripe subscription is active (set by the Stripe webhook)
 * plus the free trial, worked out from when the sign-in account was created.
 * Admins (ADMIN_EMAILS) always have access, for testing and support.
 */

export type AccessReason = "paid" | "trial" | "admin" | "none";

export interface BuyerAccess {
  verified: boolean;
  reason: AccessReason;
  paid: boolean;
  /** ISO date the trial ends, if this account has (or had) one. */
  trialEndsAt: string | null;
  trialActive: boolean;
}

const ACTIVE = new Set(["active", "trialing"]);

type AppMetadata = Record<string, unknown> & { va_paid?: boolean };

/** Writes keys into app_metadata, keeping what's already there. */
export async function setAppMetadata(
  userId: string,
  patch: Record<string, unknown>,
  current?: Record<string, unknown>
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  let base = current;
  if (!base) {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) return false;
    base = data.user.app_metadata ?? {};
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...base, ...patch }
  });
  if (error) console.error("app_metadata update failed:", error.message);
  return !error;
}

/**
 * Accounts that paid before this check existed have no va_paid yet. Work it
 * out once from Stripe (the source of truth) and store it.
 */
async function backfillPaid(user: User): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { data: row } = await admin
    .from("users")
    .select("membership_tier, stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  let paid = false;
  if (row?.membership_tier === "verified_access" && row.stripe_subscription_id) {
    try {
      const subscription = await getStripeServerClient().subscriptions.retrieve(
        row.stripe_subscription_id
      );
      paid = ACTIVE.has(subscription.status);
    } catch (error) {
      // Stripe unreachable: don't lock a paying buyer out, and don't store a
      // guess. Try again next time.
      console.error("access backfill: Stripe lookup failed:", error);
      return true;
    }
  }

  await setAppMetadata(user.id, { va_paid: paid }, user.app_metadata);
  // Keep the displayed tier honest too (it may have been edited by hand).
  if (!paid && row?.membership_tier === "verified_access") {
    await admin.from("users").update({ membership_tier: "free" }).eq("id", user.id);
  }
  return paid;
}

/**
 * `user` must come from supabase.auth.getUser() (checked with the auth
 * server), not from a session read on the client.
 */
export async function getBuyerAccess(user: User): Promise<BuyerAccess> {
  const meta = (user.app_metadata ?? {}) as AppMetadata;
  const paid = typeof meta.va_paid === "boolean" ? meta.va_paid : await backfillPaid(user);

  const ends = trialEndsAt(user.created_at);
  const trialActive = Boolean(ends && ends.getTime() > Date.now());
  const admin = isAdminUser(user);

  const reason: AccessReason = paid ? "paid" : admin ? "admin" : trialActive ? "trial" : "none";

  return {
    verified: reason !== "none",
    reason,
    paid,
    trialEndsAt: ends ? ends.toISOString() : null,
    trialActive
  };
}
