"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ALL_COUNTRIES } from "@/lib/data/countries";
import { DIAL_CODES } from "@/lib/data/dial-codes";
import { dialCodeFor, flagFor, splitInternational } from "@/lib/utils/phone";

interface Props {
  /** ISO 3166-1 alpha-2 code of the number's country (e.g. "NG", "GB"). */
  countryCode: string;
  onCountryChange: (code: string) => void;
  /** The number as typed, without the dialling code. */
  value: string;
  onChange: (value: string) => void;
  /** Classes for the number box, so it matches the surrounding form. */
  inputClassName?: string;
  placeholder?: string;
  /** Countries listed first in the picker (e.g. the farm's country). */
  priorityCodes?: string[];
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9+ ]/g, "");
}

const PHONE_COUNTRIES = ALL_COUNTRIES.filter((c) => DIAL_CODES[c.code]).map((c) => ({
  code: c.code,
  name: c.name,
  dial: DIAL_CODES[c.code],
  flag: flagFor(c.code),
  haystack: normalise(`${c.name} ${c.code} ${DIAL_CODES[c.code]} ${DIAL_CODES[c.code].slice(1)}`)
}));

/** A phone number from any country: dialling-code picker + number box. */
export function PhoneNumberInput({
  countryCode,
  onCountryChange,
  value,
  onChange,
  inputClassName = "",
  placeholder = "Phone number",
  priorityCodes = []
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const q = normalise(query.trim());
    if (q) {
      return PHONE_COUNTRIES.filter((c) => c.haystack.includes(q)).sort((a, b) => {
        const as = normalise(a.name).startsWith(q) ? 0 : 1;
        const bs = normalise(b.name).startsWith(q) ? 0 : 1;
        return as - bs || a.name.localeCompare(b.name, "en");
      });
    }
    const first = priorityCodes
      .map((code) => PHONE_COUNTRIES.find((c) => c.code === code))
      .filter((c): c is (typeof PHONE_COUNTRIES)[number] => Boolean(c));
    return [...first, ...PHONE_COUNTRIES.filter((c) => !priorityCodes.includes(c.code))];
  }, [query, priorityCodes]);

  const choose = (code: string) => {
    onCountryChange(code);
    setOpen(false);
  };

  const onNumberChange = (raw: string) => {
    // A full international number ("+44 7405…") picks its own country.
    const split = splitInternational(raw, countryCode);
    if (split) {
      onCountryChange(split.countryCode);
      onChange(split.rest);
      return;
    }
    onChange(raw.replace(/[^\d\s]/g, ""));
  };

  const dial = dialCodeFor(countryCode);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Country code ${dial || "not set"}. Change country`}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--card-border)] bg-[color:var(--search-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] transition hover:opacity-90 focus:border-[#1D9E75] focus:outline-none"
        >
          <span className="text-lg leading-none">{flagFor(countryCode)}</span>
          <span>{dial || "+…"}</span>
          <ChevronDown
            size={14}
            className={`text-[var(--text-tertiary)] transition ${open ? "rotate-180" : ""}`}
          />
        </button>
        <input
          className={`${inputClassName} min-w-0 flex-1`}
          type="tel"
          inputMode="tel"
          value={value}
          onChange={(e) => onNumberChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="tel"
        />
      </div>

      {open ? (
        <div className="absolute left-0 right-0 z-[60] mt-1 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[0_12px_32px_rgba(0,0,0,0.3)] backdrop-blur-md">
          <div className="flex items-center gap-2 border-b border-[var(--card-border)] px-3 py-2">
            <Search size={14} className="shrink-0 text-[var(--text-tertiary)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter" && results[0]) {
                  e.preventDefault();
                  choose(results[0].code);
                }
              }}
              placeholder="Search country or code…"
              aria-label="Search country or dialling code"
              className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {results.length === 0 ? (
              <li className="px-3 py-3 text-xs text-[var(--text-tertiary)]">
                No country matches &ldquo;{query}&rdquo;
              </li>
            ) : (
              results.map((c, i) => (
                <li key={`${c.code}-${i}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.code === countryCode}
                    onClick={() => choose(c.code)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[#1D9E75]/15"
                  >
                    <span className="text-lg leading-none">{c.flag}</span>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="text-[var(--text-tertiary)]">{c.dial}</span>
                    {c.code === countryCode ? <Check size={13} className="text-[#1D9E75]" /> : null}
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
