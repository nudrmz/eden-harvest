"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface DarkSelectOption {
  value: string;
  label: string;
}

interface DarkSelectProps {
  id?: string;
  value: string;
  options: DarkSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DarkSelect({
  id,
  value,
  options,
  onChange,
  placeholder = "Select…",
  disabled = false
}: DarkSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={rootRef} id={id} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((previous) => !previous)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--card-border)] bg-[color:var(--search-bg)] px-3 py-2.5 text-left text-xs text-[var(--text-primary)] shadow-[0_6px_18px_rgba(0,0,0,0.2)] transition hover:opacity-90 focus:border-[#1D9E75] focus:outline-none disabled:cursor-not-allowed disabled:opacity-45"
      >
        <span className={selected ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-[var(--text-tertiary)] transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul className="absolute left-0 right-0 z-[60] mt-1 max-h-52 overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] py-1 shadow-[0_12px_32px_rgba(0,0,0,0.25)] backdrop-blur-md no-scrollbar">
          {options.map((option) => (
            <li key={`${option.value}__${option.label}`}>
              <button
                type="button"
                className={`w-full px-3 py-2 text-left text-xs transition hover:bg-white/10 ${
                  option.value === value ? "bg-white/10 text-white" : "text-white/85"
                }`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
