import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const LEGAL_LAST_UPDATED = "14 October 2026";
export const SUPPORT_EMAIL = "support@edenharvest.app";

interface Section {
  id: string;
  title: string;
  body: React.ReactNode;
}

/** Shared shell for the public Terms and Privacy pages (no sign-in needed). */
export function LegalPage({
  title,
  intro,
  sections,
  otherLink,
  showUpdated = true
}: {
  title: string;
  /** Hide the "Last updated" line (e.g. on the support page). */
  showUpdated?: boolean;
  intro: React.ReactNode;
  sections: Section[];
  otherLink: { href: string; label: string } | { href: string; label: string }[];
}) {
  return (
    <main className="app-shell mx-auto min-h-screen w-full max-w-2xl px-4 pb-16 pt-6 text-[var(--text-primary)]">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={16} /> Eden Harvest
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-bold">{title}</h1>
      {showUpdated ? (
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">Last updated {LEGAL_LAST_UPDATED}</p>
      ) : null}
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">{intro}</div>

      <nav aria-label="Contents" className="glass-card mt-6 p-4">
        <p className="text-[length:calc(11px*var(--fs-small))] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Contents</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-[#1D9E75] hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-8 space-y-8">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-6">
            <h2 className="font-heading text-lg font-semibold">
              {i + 1}. {s.title}
            </h2>
            <div className="legal-body mt-2 space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {s.body}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-12 border-t border-[var(--card-border)] pt-6 text-xs text-[var(--text-tertiary)]">
        <p>
          Questions? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#1D9E75] hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <p className="mt-2">
          See also our{" "}
          {(Array.isArray(otherLink) ? otherLink : [otherLink]).map((l, i, all) => (
            <span key={l.href}>
              {i > 0 ? (i === all.length - 1 ? " and " : ", ") : null}
              <Link href={l.href} className="text-[#1D9E75] hover:underline">
                {l.label}
              </Link>
            </span>
          ))}
          .
        </p>
      </footer>
    </main>
  );
}

/** Bulleted list styled for legal text. */
export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
