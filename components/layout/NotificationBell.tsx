"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/layout/ThemeProvider";

interface NotificationBellProps {
  variant?: "hero" | "default";
}

const EMPTY_MESSAGE =
  "No notifications yet. We'll notify you when buyers contact sellers you follow, when new produce is listed in your saved categories, and when your orders are confirmed.";

export function NotificationBell({ variant = "hero" }: NotificationBellProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [unreadCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const buttonClass =
    variant === "hero"
      ? "border-white/20 bg-white/10"
      : "border-[var(--card-border)] bg-[var(--glass-bg)]";

  const iconColor = variant === "hero" ? "#ffffff" : theme === "dark" ? "#ffffff" : "#1A1A18";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border ${buttonClass}`}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={18} style={{ color: iconColor }} />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-eden-gold px-1 text-[9px] font-bold text-[#0f1f0f]">
            {unreadCount}
          </span>
        ) : (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-eden-gold/80" />
        )}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,320px)] overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[rgba(10,20,10,0.94)] shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
            <h2 className="font-heading text-sm font-semibold text-[var(--text-primary)]">
              Notifications
            </h2>
            <button
              type="button"
              className="text-[11px] font-medium text-eden-gold hover:underline"
              onClick={() => setOpen(false)}
            >
              Mark all read
            </button>
          </div>
          <p className="px-4 py-5 text-xs leading-relaxed text-[var(--text-secondary)]">
            {EMPTY_MESSAGE}
          </p>
        </div>
      ) : null}
    </div>
  );
}
