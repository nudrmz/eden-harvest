"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ALL_COUNTRIES,
  COUNTRY_ALIASES,
  POPULAR_COUNTRY_CODES,
  countryByCode
} from "@/lib/data/buyer-countries";

interface Props {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  /** Show the price currency next to each country. */
  showCurrency?: boolean;
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "");
}

const SEARCH_INDEX = ALL_COUNTRIES.map((c) => ({
  ...c,
  haystack: normalise([c.name, c.code, c.currency, ...(COUNTRY_ALIASES[c.code] ?? [])].join(" "))
}));

/** Searchable list of every country, popular diaspora markets first. */
export function CountrySelect({
  value,
  onChange,
  placeholder = "Select your country",
  showCurrency = true
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = countryByCode(value);

  useEffect(() => {
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      // Let the panel render before focusing the search box.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const q = normalise(query.trim());
    if (q) {
      return SEARCH_INDEX.filter((c) => c.haystack.includes(q))
        .sort((a, b) => {
          // Names that start with the query come first.
          const as = normalise(a.name).startsWith(q) ? 0 : 1;
          const bs = normalise(b.name).startsWith(q) ? 0 : 1;
          return as - bs || a.name.localeCompare(b.name, "en");
        })
        .map((c) => ({ ...c, group: null as string | null }));
    }
    const popular = POPULAR_COUNTRY_CODES.map((code) => countryByCode(code)!).map((c, i) => ({
      ...c,
      group: i === 0 ? "Popular" : null
    }));
    const rest = ALL_COUNTRIES.map((c, i) => ({ ...c, group: i === 0 ? "All countries" : null }));
    return [...popular, ...rest];
  }, [query]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const choose = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[highlight];
      if (pick) choose(pick.code);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--card-border)] bg-[color:var(--search-bg)] px-3 py-2.5 text-left text-xs shadow-[0_6px_18px_rgba(0,0,0,0.2)] transition hover:opacity-90 focus:border-[#1D9E75] focus:outline-none"
      >
        <span className={selected ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}>
          {selected ? selected.name : placeholder}
          {selected && showCurrency ? (
            <span className="ml-1.5 text-[var(--text-tertiary)]">· prices in {selected.currency}</span>
          ) : null}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-[var(--text-tertiary)] transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-[60] mt-1 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[0_12px_32px_rgba(0,0,0,0.3)] backdrop-blur-md">
          <div className="flex items-center gap-2 border-b border-[var(--card-border)] px-3 py-2">
            <Search size={14} className="shrink-0 text-[var(--text-tertiary)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search countries…"
              aria-label="Search countries"
              className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
            />
          </div>
          <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {results.length === 0 ? (
              <li className="px-3 py-3 text-xs text-[var(--text-tertiary)]">
                No country matches &ldquo;{query}&rdquo;
              </li>
            ) : (
              results.map((c, i) => (
                <li key={`${c.group ?? ""}${c.code}-${i}`}>
                  {c.group ? (
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                      {c.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.code === value}
                    data-index={i}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => choose(c.code)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-[var(--text-primary)] ${
                      i === highlight ? "bg-[#1D9E75]/15" : ""
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                      {showCurrency ? c.currency : null}
                      {c.code === value ? <Check size={13} className="text-[#1D9E75]" /> : null}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
