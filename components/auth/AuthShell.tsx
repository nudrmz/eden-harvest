"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface AuthShellProps {
  children: React.ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="app-shell relative mx-auto min-h-screen w-full max-w-md px-4 pb-10 pt-6">
      <div className="absolute right-4 top-6 z-10">
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center pt-4">
        <Link href="/" className="text-center">
          <p className="font-heading text-2xl font-bold tracking-tight text-[#1D9E75]">
            Eden Harvest
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            Africa&apos;s finest, worldwide
          </p>
        </Link>
      </div>

      <div className="mt-8">{children}</div>
    </main>
  );
}
