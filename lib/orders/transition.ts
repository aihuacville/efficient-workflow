import { prisma } from "@/lib/db";
import type { OrderStatus } from "@/lib/generated/prisma/enums";
import { type Action, type Actor, checkAction, type RefusalReason } from "./status";

// Saves a status change: checks the rules in status.ts, then updates the order and writes its
// OrderEvent (the history entry) in one transaction. Every button that moves a job goes through
// applyAction, so the rules can't be skipped.

/** What a page or API sends with an action, before it's checked. */
export type ActionRequest = {
  /** offer: the business to offer the job to. */
  businessId?: string;
  /** schedule, rebook: who does the visit. */
  technicianId?: string;
  /** schedule, rebook: when the visit starts. */
  visitStart?: Date;
  /** decline: optional reason. reportProblem: what went wrong. Saved on the history entry. */
  note?: string;
};

export type ActionResult =
  | { ok: true; status: OrderStatus }
  | { ok: false; reason: RefusalReason | "not_found" | "conflict"; error: string };

/**
 * Does `action` on an order, as `actor`. Staff find the order by id; customers by the tracking
 * token in their link, which proves it's theirs.
 */
export async function applyAction(
  where: { id: string } | { trackingToken: string },
  action: Action,
  actor: Actor,
  request: ActionRequest = {},
): Promise<ActionResult> {
  const order = await prisma.order.findUnique({
    where,
    select: { id: true, status: true, businessId: true, technicianId: true },
  });
  if (!order) return { ok: false, reason: "not_found", error: "We couldn't find that job." };

  // Load what the rules need to know about the people and business involved.
  let technician;
  if (request.technicianId) {
    technician = await prisma.user.findUnique({
      where: { id: request.technicianId },
      select: { id: true, role: true, businessId: true },
    });
    if (!technician) {
      return { ok: false, reason: "input", error: "We couldn't find that technician." };
    }
  }
  if (request.businessId) {
    const business = await prisma.business.findUnique({
      where: { id: request.businessId },
      select: { id: true },
    });
    if (!business) return { ok: false, reason: "input", error: "We couldn't find that business." };
  }

  const checked = checkAction(order, action, actor, {
    businessId: request.businessId,
    technician,
    visitStart: request.visitStart,
    note: request.note,
  });
  if (!checked.ok) return checked;
  const { changes } = checked;

  return prisma.$transaction(async (tx) => {
    // Only update if the job is still exactly as it was when we checked it. If someone changed
    // it in the meantime (two people tapping Accept at once, or the dispatcher withdrawing the
    // offer), nothing matches, nothing is saved, and this person is told to reload.
    const updated = await tx.order.updateMany({
      where: {
        id: order.id,
        status: order.status,
        businessId: order.businessId,
        technicianId: order.technicianId,
      },
      data: changes,
    });
    if (updated.count === 0) {
      return {
        ok: false as const,
        reason: "conflict" as const,
        error: "Someone else just changed this job. Reload to see the latest.",
      };
    }

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: changes.status,
        actorId: actor.kind === "staff" ? actor.id : null,
        note: request.note?.trim() || null,
      },
    });
    return { ok: true as const, status: changes.status };
  });
}
