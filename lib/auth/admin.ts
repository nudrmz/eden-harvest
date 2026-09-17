import type { User } from "@supabase/supabase-js";

/** Comma-separated admin emails in ADMIN_EMAILS (server env). */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: User | null | undefined): boolean {
  const email = user?.email?.trim().toLowerCase();
  if (!email) return false;
  return getAdminEmails().includes(email);
}
