/**
 * Free trial of Verified Access for new buyers.
 *
 * The trial isn't stored anywhere a user could edit: it's worked out from the
 * moment their sign-in account was created, which only Supabase Auth sets.
 * Only buyers who signed up after TRIAL_LAUNCH get one.
 */

export const TRIAL_DAYS = 14;

/** Accounts created before this don't get a trial (decided: new sign-ups only). */
export const TRIAL_LAUNCH = "2026-10-21T14:00:00Z";

const DAY_MS = 24 * 60 * 60 * 1000;

/** When this buyer's trial ends, or null if they don't get one. */
export function trialEndsAt(accountCreatedAt: string | null | undefined): Date | null {
  if (!accountCreatedAt) return null;
  const created = new Date(accountCreatedAt);
  if (Number.isNaN(created.getTime())) return null;
  if (created.getTime() < new Date(TRIAL_LAUNCH).getTime()) return null;
  return new Date(created.getTime() + TRIAL_DAYS * DAY_MS);
}

/** Whole days left, rounded up ("1 day left" until the very end). 0 when over. */
export function trialDaysLeft(endsAt: Date | string | null, now: Date = new Date()): number {
  if (!endsAt) return 0;
  const ms = new Date(endsAt).getTime() - now.getTime();
  return ms > 0 ? Math.ceil(ms / DAY_MS) : 0;
}

/** "Tue 4 November", for "Your free trial ends on …". */
export function formatTrialEnd(endsAt: Date | string): string {
  return new Date(endsAt).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London"
  });
}
