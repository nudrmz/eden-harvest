"use client";

import Image from "next/image";
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

      <div className="flex w-full flex-col items-center pt-4">
        <Link href="/" className="mb-6 block max-w-full">
          <Image
            src="/images/Eden-Harvest_Logo.png"
            alt="Eden Harvest"
            width={320}
            height={110}
            priority
            className="mx-auto h-[110px] w-auto max-w-full object-contain"
          />
        </Link>
      </div>

      <div>{children}</div>
    </main>
  );
}
