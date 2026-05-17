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
  const { user, loading, isAuthenticated } = useAuth();
  const sellHref = getSellHref({ isAuthenticated, profile: user });
  const inactiveTone = theme === "dark" ? "text-white/55" : "text-[#9C9C95]";
  const inactive = `flex flex-col items-center gap-1 ${inactiveTone}`;
  const inactiveLabel = `text-[10px] ${inactiveTone}`;

  return (
    <nav className="themed-nav fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 backdrop-blur-lg">
      <div className="grid grid-cols-5 px-2 py-2">
        <Link
          href="/"
          className={`relative flex flex-col items-center gap-1 ${active === "home" ? "text-[#1D9E75]" : inactive}`}
        >
          <Home size={18} />
          <span
            className={
              active === "home"
                ? "text-[10px] font-medium text-[#1D9E75]"
                : inactiveLabel
            }
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
            className={
              active === "browse"
                ? "text-[10px] font-medium text-[#1D9E75]"
                : inactiveLabel
            }
          >
            Browse
          </span>
          {active === "browse" ? (
            <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#1D9E75]" />
          ) : null}
        </Link>

        <Link
          href={loading ? "/register?role=seller" : sellHref}
          prefetch={!loading}
          className={`relative flex flex-col items-center gap-1 ${active === "sell" ? "text-[#1D9E75]" : inactive} ${loading ? "pointer-events-none opacity-60" : ""}`}
          aria-label={loading ? "Loading sell" : "Sell"}
        >
          <PlusCircle size={18} />
          <span
            className={
              active === "sell"
                ? "text-[10px] font-medium text-[#1D9E75]"
                : inactiveLabel
            }
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
          href={user ? "/settings" : "/login"}
          className={`relative flex flex-col items-center gap-1 ${active === "profile" ? "text-[#1D9E75]" : inactive}`}
        >
          <User size={18} />
          <span
            className={
              active === "profile"
                ? "text-[10px] font-medium text-[#1D9E75]"
                : inactiveLabel
            }
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
