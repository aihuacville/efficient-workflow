"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-renders the page with fresh data every `seconds`, and as soon as the viewer returns to the
 * tab. Only the server data is refreshed, so anything being typed on the page is kept.
 * The first step of real-time tracking; a real-time service replaces this later.
 */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    // Skip refreshes while the tab is hidden, so a phone in a pocket doesn't keep asking.
    const refresh = () => document.visibilityState === "visible" && router.refresh();
    const timer = setInterval(refresh, seconds * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, seconds]);
  return null;
}
