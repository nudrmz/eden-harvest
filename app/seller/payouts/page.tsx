"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Landmark } from "lucide-react";

const field = "eden-field-input !px-4 !py-3 !text-base";

/** Farmer: the Nigerian bank account Eden Harvest pays order money into. */
export default function PayoutAccountPage() {
  const [account, setAccount] = useState<{ bankName: string; accountNumber: string; accountName: string } | null>(null);
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  async function load() {
    const res = await fetch("/api/seller/payout-account", { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) setError(body.error ?? "Couldn't load your payout account.");
    else setAccount(body.account);
  }

  useEffect(() => {
    void load();
    void fetch("/api/banks").then((r) => r.json()).then((b) => setBanks(b.banks ?? []));
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const bankName = banks.find((b) => b.code === bankCode)?.name ?? "";
      const res = await fetch("/api/seller/payout-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankCode, bankName, accountNumber: number })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't save.");
      setMessage(`Saved. Payments will go to ${body.accountName}.`);
      setEditing(false);
      setNumber("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 pb-16 pt-6 text-[var(--text-primary)]">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
        <ArrowLeft size={16} /> Dashboard
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-bold">Payout account</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        When a buyer confirms an order (or the protection period ends), we pay the order total minus Eden Harvest&apos;s fee into
        this Nigerian bank account.
      </p>

      {account && !editing ? (
        <section className="glass-card mt-5 flex items-center gap-3 p-4">
          <Landmark className="text-[#1D9E75]" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">{account.accountName}</p>
            <p className="text-[var(--text-secondary)]">{account.bankName} · {account.accountNumber}</p>
          </div>
          <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-eden-gold">Change</button>
        </section>
      ) : (
        <section className="glass-card mt-5 space-y-3 p-4">
          <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} className={field}>
            <option value="">Choose your bank</option>
            {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
          <input value={number} onChange={(e) => setNumber(e.target.value)} inputMode="numeric" maxLength={10} placeholder="10-digit account number" className={field} />
          <button type="button" disabled={busy || !bankCode || number.replace(/\D/g, "").length !== 10} onClick={() => void save()} className="w-full rounded-xl bg-[#1D9E75] py-3 font-semibold text-white disabled:opacity-50">
            {busy ? "Checking account…" : "Verify and save"}
          </button>
          <p className="text-xs text-[var(--text-tertiary)]">We check the number with your bank and show the account name before saving. Only Eden Harvest admins can see your full details.</p>
        </section>
      )}
      {message ? <p className="mt-3 text-sm text-[#1D9E75]">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-[#F09595]">{error}</p> : null}
    </main>
  );
}
