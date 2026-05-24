"use client";

import Link from "next/link";
import { Heart, Home, PlusCircle, Search, User } from "lucide-react";
import { useTheme } from "@/components/layout/ThemeProvider";
import { useAuth } from "@/lib/supabase/hooks";
import { getSellHref } from "@/lib/navigation/sell";

export type BottomNavActive = "home" | "browse" | "sell" | "saved" | "profile";

interface MobileBottomNavProps {
  active: BottomNavActive;
}

export function MobileBottomNav({ active }: MobileBottomNavProps) {
  const { theme } = useTheme();
  const { loading, isAuthenticated, user } = useAuth();
  const sellHref = getSellHref({
    isAuthenticated: loading ? false : isAuthenticated,
    profile: loading ? null : user
  });
  const inactiveTone = theme === "dark" ? "text-white/55" : "text-[#9C9C95]";
  const inactive = `flex flex-col items-center gap-1 ${inactiveTone}`;
  const inactiveLabel = `eden-nav-label ${inactiveTone}`;
  const activeLabel = "eden-nav-label font-semibold text-[#1D9E75]";

  return (
    <nav className="themed-nav fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 backdrop-blur-lg">
      <div className="grid grid-cols-5 px-2 py-2">
        <Link
          href="/"
          className={`relative flex flex-col items-center gap-1 ${active === "home" ? "text-[#1D9E75]" : inactive}`}
        >
          <Home size={18} />
          <span
            className={active === "home" ? activeLabel : inactiveLabel}
          >
            Home
          </span>
          {active === "home" ? (
            <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#1D9E75]" />
          ) : null}
        </Link>

        <Link
          href="/browse"
          className={`relative flex flex-col items-center gap-1 ${active === "browse" ? "text-[#1D9E75]" : inactive}`}
        >
          <Search size={18} />
          <span
            className={active === "browse" ? activeLabel : inactiveLabel}
          >
            Browse
          </span>
          {active === "browse" ? (
            <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#1D9E75]" />
          ) : null}
        </Link>

        <Link
          href={sellHref}
          className={`relative flex flex-col items-center gap-1 ${active === "sell" ? "text-[#1D9E75]" : inactive}`}
          aria-label="Sell"
        >
          <PlusCircle size={18} />
          <span
            className={active === "sell" ? activeLabel : inactiveLabel}
          >
            Sell
          </span>
          {active === "sell" ? (
            <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#1D9E75]" />
          ) : null}
        </Link>

        <button type="button" className={`${inactive} cursor-default`}>
          <Heart size={18} />
          <span className={inactiveLabel}>Saved</span>
        </button>

        <Link
          href="/profile"
          prefetch
          className={`relative flex flex-col items-center gap-1 ${active === "profile" ? "text-[#1D9E75]" : inactive}`}
        >
          <User size={18} />
          <span
            className={active === "profile" ? activeLabel : inactiveLabel}
          >
            Profile
          </span>
          {active === "profile" ? (
            <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#1D9E75]" />
          ) : null}
        </Link>
      </div>
    </nav>
  );
}
