import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { homeFor, SESSION_COOKIE } from "@/lib/session";

// The demo account switcher: "sign in" as any demo staff member, with no password.

/** POST /api/session with { "userId": "..." }: switches to that account. */
export async function POST(request: Request) {
  const { userId } = ((await request.json().catch(() => ({}))) ?? {}) as { userId?: unknown };
  if (typeof userId !== "string") {
    return Response.json({ error: "Send { userId } as JSON" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return Response.json({ error: "No such account" }, { status: 404 });

  (await cookies()).set(SESSION_COOKIE, userId, {
    httpOnly: true, // page scripts can't read it
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // a week
  });
  return Response.json({ home: homeFor(user.role) });
}

/** DELETE /api/session: signs out. */
export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
