import { type NextRequest, NextResponse } from "next/server";

// Demo password for the staff side. Without it, anyone with the link could use the account
// switcher to become the dispatcher and cancel jobs. Customer pages (home, request form, tracking)
// stay open, so the audience can scan the QR code and try them.
// The browser asks with its own sign-in prompt (HTTP Basic auth): any username, and the password
// in the DEMO_PASSWORD environment variable. When DEMO_PASSWORD isn't set, as on a laptop,
// nothing is protected. Real sign-in replaces this in the pilot.

export const config = {
  matcher: ["/dispatch/:path*", "/jobs/:path*", "/api/session/:path*", "/api/orders/:id/actions"],
};

/** Compares in constant time, so how long a wrong guess takes doesn't hint at the password. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(request: NextRequest) {
  const password = process.env.DEMO_PASSWORD;
  if (!password) return NextResponse.next();

  // The browser sends "Basic <base64 of username:password>" once the person has signed in.
  const [scheme, encoded] = (request.headers.get("authorization") ?? "").split(" ");
  if (scheme === "Basic" && encoded) {
    try {
      const decoded = atob(encoded);
      if (safeEqual(decoded.slice(decoded.indexOf(":") + 1), password)) return NextResponse.next();
    } catch {
      // Not valid base64: treat it as a wrong password.
    }
  }

  return new NextResponse("Staff pages need the demo password.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Efficient Workflow staff", charset="UTF-8"' },
  });
}
