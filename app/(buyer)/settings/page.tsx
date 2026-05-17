"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function SettingsPage() {
  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 pb-24 pt-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="glass-card flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-primary)]"
            aria-label="Back to home"
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="font-heading text-xl font-semibold text-[var(--text-primary)]">Settings</h1>
        </div>
        <ThemeToggle />
      </div>

      <p className="mt-8 text-sm text-[var(--text-secondary)]">
        Account and notification preferences will appear here soon.
      </p>

      <MobileBottomNav active="profile" />
    </main>
  );
}
