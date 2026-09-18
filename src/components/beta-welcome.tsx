"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const dismissalKey = "momentum-beta-welcome-v1";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("momentum-welcome-dismissed", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("momentum-welcome-dismissed", callback);
  };
}
function getDismissed() {
  try { return window.localStorage.getItem(dismissalKey) === "dismissed"; } catch { return false; }
}

export default function BetaWelcome() {
  const dismissed = useSyncExternalStore(subscribe, getDismissed, () => false);
  const [dismissedThisVisit, setDismissedThisVisit] = useState(false);

  if (dismissed || dismissedThisVisit) return null;
  return (
    <aside aria-label="Welcome to the Momentum beta" className="mx-5 mt-5 rounded-2xl border border-[#dce7de] bg-[#edf3ee] p-4 sm:mx-8 lg:mx-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#45634c]">Welcome to the Momentum beta</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">Build your routine with Goals, work through Projects, and use Focus to make time for what matters. Check Progress to see your activity. Features are still evolving—your feedback helps shape what comes next.</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-[#45634c]">
            <a href="mailto:momentumdaily.business@gmail.com?subject=Momentum%20beta%20feedback" className="hover:underline">Send feedback</a>
            <Link href="/privacy" className="hover:underline">Privacy notice</Link>
          </div>
        </div>
        <button type="button" aria-label="Dismiss beta welcome" onClick={() => {
          setDismissedThisVisit(true);
          try { window.localStorage.setItem(dismissalKey, "dismissed"); } catch { /* Storage may be unavailable. */ }
          window.dispatchEvent(new Event("momentum-welcome-dismissed"));
        }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#45634c] hover:bg-[#dce7de] focus-visible:outline-2 focus-visible:outline-[#45634c]">×</button>
      </div>
    </aside>
  );
}
