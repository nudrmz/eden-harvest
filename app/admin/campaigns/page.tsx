"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, Download, QrCode } from "lucide-react";
import { useAuth } from "@/lib/supabase/hooks";

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

/** Render the QR SVG onto a canvas so it can be saved as a PNG for Canva/WhatsApp. */
async function downloadPng(slug: string) {
  const res = await fetch(`/api/admin/campaigns/qr?slug=${encodeURIComponent(slug)}`);
  if (!res.ok) return;
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
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `eden-harvest-qr-${slug}.png`;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function AdminCampaignsPage() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
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

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
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
                onClick={() => void copy(link.url)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              >
                {copied === link.url ? <Check size={13} /> : <Copy size={13} />}
                {copied === link.url ? "Copied" : "Copy link"}
              </button>
              <button
                type="button"
                onClick={() => setPreview(preview === link.slug ? null : link.slug)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <QrCode size={13} /> {preview === link.slug ? "Hide QR" : "Show QR"}
              </button>
              <button
                type="button"
                onClick={() => void downloadPng(link.slug)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <Download size={13} /> PNG
              </button>
              <a
                href={`/api/admin/campaigns/qr?slug=${link.slug}&download=1`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <Download size={13} /> SVG (print)
              </a>
            </div>
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
