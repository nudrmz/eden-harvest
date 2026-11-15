"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Database } from "lucide-react";

interface Status {
  configured?: boolean;
  applied?: boolean;
  version?: string;
  error?: string;
}

/** Admin-only: create or update the database tables the app needs. */
export default function AdminSetupPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function check() {
    const res = await fetch("/api/admin/db/setup", { cache: "no-store" });
    setStatus((await res.json()) as Status);
  }

  useEffect(() => {
    void check();
  }, []);

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/db/setup", { method: "POST" });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Setup failed.");
      setMessage("Database is up to date.");
      await check();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Setup failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 pb-16 pt-6 text-[var(--text-primary)]">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
        <ArrowLeft size={16} /> Profile
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-bold">Set up database</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Creates the tables for orders, buyer protection and farmer payouts. Safe to run more than once; existing
        data is never removed.
      </p>

      <section className="glass-card mt-5 p-4 text-sm">
        {!status ? (
          <p className="text-[var(--text-secondary)]">Checking…</p>
        ) : status.configured === false ? (
          <p className="text-[#F09595]">No direct database connection is set up on this deployment.</p>
        ) : status.applied ? (
          <p className="flex items-center gap-2 text-[#1D9E75]">
            <CheckCircle2 size={18} /> Up to date ({status.version})
          </p>
        ) : (
          <p className="text-eden-gold">Update needed ({status.version}).</p>
        )}
        {status?.error ? <p className="mt-2 break-words text-xs text-[#F09595]">{status.error}</p> : null}

        <button
          type="button"
          disabled={busy || status?.configured === false}
          onClick={() => void run()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1D9E75] px-4 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          <Database size={16} /> {busy ? "Working…" : status?.applied ? "Run again" : "Set up database"}
        </button>
        {message ? <p className="mt-3 text-sm">{message}</p> : null}
      </section>
    </main>
  );
}
