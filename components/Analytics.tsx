"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";
import { GA_ID, safePath, safeUrl } from "@/lib/analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

/**
 * Google Analytics page views for customer pages (see lib/analytics.ts). Sends cleaned addresses
 * only, with Google's advertising features off. Doesn't load at all when the browser sends
 * Global Privacy Control, or when NEXT_PUBLIC_GA_ID isn't set.
 */
export function Analytics() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);

  // Decided in the browser, where the Global Privacy Control setting can be read.
  useEffect(() => {
    if (!GA_ID || navigator.globalPrivacyControl) return;
    if (!window.gtag) {
      window.dataLayer = window.dataLayer ?? [];
      // gtag.js expects the `arguments` object itself, not an array.
      window.gtag = function gtag() {
        window.dataLayer!.push(arguments);
      };
      window.gtag("js", new Date());
      window.gtag("config", GA_ID, {
        send_page_view: false, // Sent below, with the cleaned address.
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
    }
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled || !window.gtag) return;
    const page_location = window.location.origin + safePath(pathname);
    // Set for every later event too, so nothing else picks up the real address.
    window.gtag("set", { page_location, page_referrer: safeUrl(document.referrer) });
    window.gtag("event", "page_view", { page_location, page_title: document.title });
  }, [enabled, pathname]);

  if (!enabled) return null;
  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      strategy="afterInteractive"
    />
  );
}
