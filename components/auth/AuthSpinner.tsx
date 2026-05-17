export function AuthSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2" role="status" aria-live="polite">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
    </div>
  );
}
