"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { PasswordStrength } from "@/lib/utils/helpers";

const strengthColors: Record<PasswordStrength, string> = {
  weak: "#F09595",
  medium: "#FAC775",
  strong: "#5DCAA5"
};

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  showStrength?: boolean;
  strength?: PasswordStrength;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete = "current-password",
  showStrength = false,
  strength = "weak"
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11px] text-[var(--text-secondary)]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="eden-field-input w-full rounded-xl border border-[var(--card-border)] bg-[color:var(--search-bg)] px-3 py-2.5 pr-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[#1D9E75] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {showStrength && value.length > 0 ? (
        <div className="mt-2">
          <div className="flex h-1 overflow-hidden rounded-full bg-[var(--card-border)]">
            <span
              className="h-full rounded-full transition-all duration-300"
              style={{
                width:
                  strength === "weak" ? "33%" : strength === "medium" ? "66%" : "100%",
                backgroundColor: strengthColors[strength]
              }}
            />
          </div>
          <p className="mt-1 text-[10px] capitalize text-[var(--text-tertiary)]">
            {strength} password
          </p>
        </div>
      ) : null}
    </div>
  );
}
