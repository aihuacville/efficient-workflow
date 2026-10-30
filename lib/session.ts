import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/generated/prisma/enums";
import type { Actor } from "@/lib/orders/status";

// Who's signed in. For the demo, it's whoever was picked in the account switcher, kept in a
// cookie: there are no passwords, so anyone with the link can be anyone. Real sign-in replaces
// this file in the pilot; pages only call getCurrentUser() and toActor().

export const SESSION_COOKIE = "demo_user";

const userFields = {
  id: true,
  name: true,
  role: true,
  businessId: true,
  business: { select: { name: true } },
} as const;

export type SessionUser = {
  id: string;
  name: string;
  role: Role;
  businessId: string | null;
  business: { name: string } | null;
};

/** The signed-in staff member, or null if nobody is picked yet. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id }, select: userFields });
}

/** Everyone the account switcher offers: dispatchers first, then each business's staff. */
export async function listAccounts(): Promise<SessionUser[]> {
  return prisma.user.findMany({
    select: userFields,
    orderBy: [{ businessId: { sort: "asc", nulls: "first" } }, { role: "asc" }, { name: "asc" }],
  });
}

export function toActor(user: SessionUser): Actor {
  return { kind: "staff", id: user.id, role: user.role, businessId: user.businessId };
}

/** Where each role starts after switching. */
export function homeFor(role: Role) {
  return role === "DISPATCHER" ? "/dispatch" : "/jobs";
}
