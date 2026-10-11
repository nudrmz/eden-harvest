"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, Download, QrCode } from "lucide-react";
import { useAuth } from "@/lib/supabase/hooks";
import { copyText } from "@/lib/utils/clipboard";

interface Tally {
  total: number;
  buyers: number;
  sellers: number;
  last30: number;
}

interface CampaignRow {
  slug: string;
  label: string;
  url: string;
  audience: "buyers" | "sellers";
  signups: Tally;
}

interface Payload {
  links?: CampaignRow[];
  other?: { key: string; signups: Tally }[];
  untracked?: Tally;
  totalUsers?: number;
  error?: string;
}

type ActionState = "busy" | "done" | "failed";

const BUTTON_BASE =
  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition duration-150 active:scale-95 select-none";

function buttonClass(state?: ActionState | "on"): string {
  switch (state) {
    case "done":
    case "on":
      return `${BUTTON_BASE} border-[#1D9E75] bg-[#1D9E75]/15 text-[#1D9E75]`;
    case "failed":
      return `${BUTTON_BASE} border-[#E5484D] bg-[#E5484D]/10 text-[#E5484D]`;
    case "busy":
      return `${BUTTON_BASE} border-[var(--card-border)] text-[var(--text-secondary)] opacity-70`;
    default:
      return `${BUTTON_BASE} border-[var(--card-border)] text-[var(--text-primary)] hover:border-[#1D9E75]/60 hover:bg-[#1D9E75]/5`;
  }
}

/** Render the QR SVG onto a canvas so it can be saved as a PNG for Canva/WhatsApp. */
async function downloadPng(slug: string): Promise<boolean> {
  const res = await fetch(`/api/admin/campaigns/qr?slug=${encodeURIComponent(slug)}`);
  if (!res.ok) return false;
  const svg = await res.text();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("load"));
      img.src = url;
    });
    const size = 2000;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `eden-harvest-qr-${slug}.png`;
    a.click();
    return true;
  } catch {
    return false;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function AdminCampaignsPage() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  // Per-button feedback, keyed "<slug>:<action>".
  const [actions, setActions] = useState<Record<string, ActionState>>({});
  // Shown when copying is blocked, so the link can be copied by hand.
  const [manualCopy, setManualCopy] = useState<string | null>(null);

  const setAction = (key: string, state: ActionState | null, clearAfterMs?: number) => {
    setActions((prev) => {
      const next = { ...prev };
      if (state) next[key] = state;
      else delete next[key];
      return next;
    });
    if (state && clearAfterMs) {
      setTimeout(() => {
        setActions((prev) => {
          if (prev[key] !== state) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, clearAfterMs);
    }
  };
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/campaigns");
      setData((await res.json()) as Payload);
    } catch {
      setData({ error: "Could not load campaigns." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, isAuthenticated, load]);

  const copy = async (slug: string, url: string) => {
    const ok = await copyText(url);
    setAction(`${slug}:copy`, ok ? "done" : "failed", 2500);
    setManualCopy(ok ? null : slug);
  };

  const savePng = async (slug: string) => {
    setAction(`${slug}:png`, "busy");
    const ok = await downloadPng(slug).catch(() => false);
    setAction(`${slug}:png`, ok ? "done" : "failed", 2500);
  };

  if (authLoading || loading) {
    return (
      <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 py-8">
        <p className="text-sm text-[var(--text-secondary)]">Loading campaigns…</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 py-8">
        <p className="text-sm text-[var(--text-secondary)]">Sign in with an admin account.</p>
        <Link
          href="/login?redirect=/admin/campaigns"
          className="mt-4 inline-flex rounded-xl bg-[#1D9E75] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Sign in
        </Link>
      </main>
    );
  }

  const links = data?.links ?? [];

  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-md px-4 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/profile" aria-label="Back" className="text-[var(--text-tertiary)]">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-semibold text-[var(--text-primary)]">
            Campaign links
          </h1>
          <p className="text-xs text-[var(--text-tertiary)]">
            Short links, QR codes and the sign-ups each one brought in
          </p>
        </div>
      </div>

      {data?.error ? (
        <p className="mt-4 rounded-xl border border-[#F0959540] bg-[#F0959518] px-3 py-2.5 text-sm text-[#F09595]">
          {data.error}
        </p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {links.map((link) => (
          <li key={link.slug} className="glass-card rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{link.label}</p>
                <p className="mt-0.5 truncate font-mono text-xs text-[#5DCAA5]">
                  {link.url.replace(/^https?:\/\//, "")}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold leading-none text-[var(--text-primary)]">
                  {link.signups.total}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                  sign-ups
                </p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
              {link.signups.buyers} buyers · {link.signups.sellers} sellers ·{" "}
              {link.signups.last30} in last 30 days
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copy(link.slug, link.url)}
                className={buttonClass(actions[`${link.slug}:copy`])}
                aria-live="polite"
              >
                {actions[`${link.slug}:copy`] === "done" ? (
                  <>
                    <Check size={13} /> Copied!
                  </>
                ) : actions[`${link.slug}:copy`] === "failed" ? (
                  <>
                    <Copy size={13} /> Copy blocked
                  </>
                ) : (
                  <>
                    <Copy size={13} /> Copy link
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setPreview(preview === link.slug ? null : link.slug)}
                className={buttonClass(preview === link.slug ? "on" : undefined)}
                aria-pressed={preview === link.slug}
              >
                <QrCode size={13} /> {preview === link.slug ? "Hide QR" : "Show QR"}
              </button>
              <button
                type="button"
                onClick={() => void savePng(link.slug)}
                disabled={actions[`${link.slug}:png`] === "busy"}
                className={buttonClass(actions[`${link.slug}:png`])}
              >
                {actions[`${link.slug}:png`] === "done" ? <Check size={13} /> : <Download size={13} />}
                {actions[`${link.slug}:png`] === "busy"
                  ? "Saving…"
                  : actions[`${link.slug}:png`] === "done"
                    ? "PNG saved"
                    : actions[`${link.slug}:png`] === "failed"
                      ? "Try again"
                      : "PNG"}
              </button>
              <a
                href={`/api/admin/campaigns/qr?slug=${link.slug}&download=1`}
                onClick={() => setAction(`${link.slug}:svg`, "done", 2500)}
                className={buttonClass(actions[`${link.slug}:svg`])}
              >
                {actions[`${link.slug}:svg`] === "done" ? <Check size={13} /> : <Download size={13} />}
                {actions[`${link.slug}:svg`] === "done" ? "SVG saved" : "SVG (print)"}
              </a>
            </div>
            {manualCopy === link.slug ? (
              <div className="mt-3">
                <p className="mb-1 text-[11px] text-[var(--text-secondary)]">
                  Your browser blocked copying. Press and hold (or select) the link below to copy it:
                </p>
                <input
                  readOnly
                  value={link.url}
                  onFocus={(e) => e.currentTarget.select()}
                  autoFocus
                  className="eden-field-input font-mono text-xs"
                />
              </div>
            ) : null}
            {preview === link.slug ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/admin/campaigns/qr?slug=${link.slug}`}
                alt={`QR code for ${link.url}`}
                className="mx-auto mt-4 w-48 rounded-xl bg-white p-2"
              />
            ) : null}
          </li>
        ))}
      </ul>

      {(data?.other?.length ?? 0) > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Other tagged links</h2>
          <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
            {data?.other?.map((o) => (
              <li key={o.key}>
                {o.key.replace(/^source:/, "")} — {o.signups.total} sign-ups
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-6 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
        A sign-up counts towards the first campaign link that person opened (remembered for 90
        days). {data?.untracked?.total ?? 0} of {data?.totalUsers ?? 0} accounts came without a
        campaign link — including everyone who signed up before tracking started. To add a link,
        edit <code>lib/campaigns/links.json</code> and redeploy.
      </p>
    </main>
  );
}
