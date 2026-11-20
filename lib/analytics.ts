// Google Analytics, customer pages only. Off unless NEXT_PUBLIC_GA_ID is set (a GA4 measurement
// ID such as G-XXXXXXXXXX). Analytics must never receive a tracking link: anyone with
// /track/<token> can see the customer's address. So page addresses are cleaned here before they're
// sent, and nothing from the forms (name, phone, address, notes) is ever sent as event data.
// If you change what's measured, update the privacy page (app/(public)/privacy/page.tsx).

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/** The path with secrets taken out: /track/abc123 → /track/:token. */
export function safePath(pathname: string): string {
  return pathname.replace(/^\/track\/[^/]+/, "/track/:token");
}

/** A full address (or a referrer) with the path cleaned and the query string and hash dropped. */
export function safeUrl(url: string): string {
  try {
    const { origin, pathname } = new URL(url);
    return origin + safePath(pathname);
  } catch {
    return ""; // Empty or not a URL (a direct visit has no referrer).
  }
}
