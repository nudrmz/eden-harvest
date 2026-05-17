"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings, Shield, User } from "lucide-react";
import { useAuth } from "@/lib/supabase/hooks";
import { getInitials } from "@/lib/utils/helpers";

interface UserMenuProps {
  /** Hero header — light text on photo */
  variant?: "hero" | "default";
}

export function UserMenu({ variant = "hero" }: UserMenuProps) {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  if (loading) {
    return (
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full border ${
          variant === "hero" ? "border-white/25 bg-white/10" : "border-[var(--card-border)] bg-[var(--glass-bg)]"
        }`}
      >
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
      </span>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className={`rounded-full border px-3 py-2 text-xs font-semibold ${
          variant === "hero"
            ? "border-white/30 bg-white/10 text-white"
            : "border-[var(--card-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
        }`}
        style={variant === "hero" ? { textShadow: "0 1px 4px rgba(0,0,0,0.45)" } : undefined}
      >
        Sign in
      </Link>
    );
  }

  const initials = getInitials(user.full_name);

  async function handleSignOut() {
    await signOut();
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-full border px-1 py-1 pr-2 ${
          variant === "hero"
            ? "border-white/25 bg-white/10"
            : "border-[var(--card-border)] bg-[var(--glass-bg)]"
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1D9E75] text-sm font-semibold text-white"
          style={variant === "hero" ? { textShadow: "0 1px 4px rgba(0,0,0,0.35)" } : undefined}
        >
          {initials}
        </span>
        <ChevronDown
          size={14}
          className={variant === "hero" ? "text-white/80" : "text-[var(--text-tertiary)]"}
        />
      </button>

      {open ? (
        <ul
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 min-w-[220px] overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] py-1 shadow-[0_12px_32px_rgba(0,0,0,0.3)]"
        >
          <li>
            <Link
              href="/"
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[rgba(29,158,117,0.12)]"
              onClick={() => setOpen(false)}
            >
              <User size={16} className="text-[#1D9E75]" />
              My account
            </Link>
          </li>
          <li>
            <Link
              href="/upgrade"
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[rgba(29,158,117,0.12)]"
              onClick={() => setOpen(false)}
            >
              <Shield size={16} className="text-eden-gold" />
              Upgrade to Verified Access
            </Link>
          </li>
          <li>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[rgba(29,158,117,0.12)]"
              onClick={() => setOpen(false)}
            >
              <Settings size={16} className="text-[var(--text-tertiary)]" />
              Settings
            </button>
          </li>
          <li className="border-t border-[var(--card-border)]">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#F09595] hover:bg-[rgba(240,149,149,0.1)]"
              onClick={() => void handleSignOut()}
            >
              <LogOut size={16} />
              Log out
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
