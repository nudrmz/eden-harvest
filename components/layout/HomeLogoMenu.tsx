"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, User } from "lucide-react";
import { FarmLogoAvatar } from "@/components/ui/FarmLogoAvatar";
import { useTheme } from "@/components/layout/ThemeProvider";
import { useAuth } from "@/lib/supabase/hooks";

export function HomeLogoMenu() {
  const router = useRouter();
  const { theme } = useTheme();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  async function handleSignOut() {
    await signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative z-[60] shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <FarmLogoAvatar size={72} variant="hero" priority className="mt-0.5" />
      </button>

      {open ? (
        <ul
          role="menu"
          className={`absolute left-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-xl border bg-transparent py-1 shadow-[0_12px_32px_rgba(0,0,0,0.2)] backdrop-blur-xl ${
            theme === "dark"
              ? "border-[rgba(255,255,255,0.12)]"
              : "border-[rgba(0,0,0,0.1)]"
          }`}
        >
          <li>
            <Link
              href="/profile"
              role="menuitem"
              className="flex items-center gap-2 bg-transparent px-3 py-2.5 text-sm font-medium hover:bg-transparent"
              onClick={() => setOpen(false)}
            >
              <User size={16} className="text-[#1D9E75]" />
              <span className={theme === "dark" ? "text-white" : "text-[#1A1A18]"}>My Profile</span>
            </Link>
          </li>
          <li
            className={`border-t ${
              theme === "dark" ? "border-[rgba(255,255,255,0.1)]" : "border-[rgba(0,0,0,0.08)]"
            }`}
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 bg-transparent px-3 py-2.5 text-left text-sm font-medium text-[#F09595] hover:bg-transparent"
              onClick={() => void handleSignOut()}
            >
              <LogOut size={16} />
              Sign out
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
