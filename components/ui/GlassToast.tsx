"use client";

import { useEffect, useState } from "react";

interface GlassToastProps {
  message: string | null;
  durationMs?: number;
  onDismiss?: () => void;
}

export function GlassToast({ message, durationMs = 3000, onDismiss }: GlassToastProps) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  if (!message || !visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-24 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(10,20,10,0.92)] px-4 py-3 text-center text-sm text-[rgba(255,255,255,0.92)] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
    >
      {message}
    </div>
  );
}
