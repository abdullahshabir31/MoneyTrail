import { useEffect, useState } from "react";
import { Download, X, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "mt-install-dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true // iOS Safari
  );
}

function dismissedThisVisit() {
  // sessionStorage clears when the tab/browser closes, so "maybe later"
  // only hides the banner for the rest of this visit — closing and
  // reopening the site brings it back, as requested.
  return window.sessionStorage.getItem(DISMISS_KEY) === "1";
}

/**
 * Bottom install banner shown to any visitor whose browser fires
 * `beforeinstallprompt` (Chrome/Edge/Android — the standard PWA install
 * flow). Safari/iOS never fires this event, so the banner simply never
 * appears there; there's no reliable programmatic install prompt to trigger
 * on iOS anyway.
 */
// How long to wait, after the page has fully loaded, before the banner
// slides in — so it doesn't compete with the initial page render.
const SHOW_DELAY_MS = 3500;

export function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || dismissedThisVisit()) return;

    let showTimer = null;
    let pendingEvent = null;

    const scheduleShow = () => {
      if (showTimer) return; // already scheduled
      const reveal = () => {
        // Re-check: user may have dismissed or the app may have been
        // installed while we were waiting.
        if (isStandalone() || dismissedThisVisit()) return;
        setDeferredEvent(pendingEvent);
        setVisible(true);
      };
      if (document.readyState === "complete") {
        showTimer = window.setTimeout(reveal, SHOW_DELAY_MS);
      } else {
        window.addEventListener(
          "load",
          () => {
            showTimer = window.setTimeout(reveal, SHOW_DELAY_MS);
          },
          { once: true },
        );
      }
    };

    const onBeforeInstall = (e) => {
      e.preventDefault();
      pendingEvent = e;
      scheduleShow();
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferredEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (showTimer) window.clearTimeout(showTimer);
    };
  }, []);

  const dismiss = () => {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferredEvent) return;
    deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    if (outcome !== "accepted") {
      // They saw the native prompt and said no — treat like "maybe later"
      // for the rest of this visit only.
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    }
    setDeferredEvent(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
      <div className="surface animate-in fade-in slide-in-from-bottom-6 relative flex w-full max-w-md items-center gap-3 border border-border p-4 shadow-[var(--shadow-float)] duration-500 ease-out">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Wallet className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Install MoneyTrail</p>
          <p className="text-xs text-muted-foreground">
            Add it to your home screen for quick, app-like access.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Maybe later
          </Button>
          <Button size="sm" onClick={install}>
            <Download className="size-4" /> Install
          </Button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted sm:hidden"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
