"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

/** Chrome/Edge/Samsung Internet fire this when the site is installable. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "eden_harvest_install_dismissed_at";
const DISMISS_DAYS = 14;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
  // Only Safari can add to home screen on older iOS; in-app browsers
  // (WhatsApp, Instagram, Facebook) can't, so don't show steps that won't work.
  const inAppOrOtherBrowser = /CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|WhatsApp|Line\//.test(ua);
  return iOS && !inAppOrOtherBrowser;
}

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function InstallAppPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"hidden" | "native" | "ios">("hidden");
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    if (isIosSafari()) {
      setMode("ios");
      return;
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setMode("native");
    };
    const onInstalled = () => setMode("hidden");

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setMode("hidden");
  };

  const install = async () => {
    if (mode === "ios") {
      setShowIosSteps((v) => !v);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setMode("hidden");
  };

  if (mode === "hidden") return null;

  return (
    <section className="px-4 pt-4">
      <div className="relative rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-2 top-2 rounded-full p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 pr-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Get the Eden Harvest app
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Add it to your home screen — free, no app store needed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void install()}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1D9E75] px-3 py-2 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(29,158,117,0.35)]"
          >
            <Download size={14} />
            Install
          </button>
        </div>

        {mode === "ios" && showIosSteps ? (
          <ol className="mt-3 space-y-2 border-t border-[var(--card-border)] pt-3 text-xs text-[var(--text-secondary)]">
            <li className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text-primary)]">1.</span>
              Tap the Share button
              <Share size={14} className="text-[#1D9E75]" />
              in Safari&apos;s toolbar
            </li>
            <li className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text-primary)]">2.</span>
              Choose &ldquo;Add to Home Screen&rdquo;
              <SquarePlus size={14} className="text-[#1D9E75]" />
            </li>
            <li className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text-primary)]">3.</span>
              Tap &ldquo;Add&rdquo; — Eden Harvest appears with your apps
            </li>
          </ol>
        ) : null}
      </div>
    </section>
  );
}
