import type { OrderStatus } from "@/lib/generated/prisma/enums";

// The customer's tracking timeline. No database access, so it's tested on its own.

/** The steps the customer sees, and the status that completes each one. */
export const TRACKING_STEPS = [
  { label: "Request received", status: "NEW" },
  { label: "Business assigned", status: "ACCEPTED" },
  { label: "Visit scheduled", status: "SCHEDULED" },
  { label: "Technician on the way", status: "ON_THE_WAY" },
  { label: "Work done", status: "DONE" },
  { label: "You confirm", status: "CONFIRMED" },
] as const satisfies readonly { label: string; status: OrderStatus }[];

/**
 * The last step each status has reached. Some statuses share a step: "Offered" is still
 * "finding a business" to the customer, and "In progress" comes after "on the way".
 * Cancelled orders have no timeline.
 */
const REACHED: Record<OrderStatus, number | null> = {
  NEW: 0,
  OFFERED: 0,
  ACCEPTED: 1,
  SCHEDULED: 2,
  ON_THE_WAY: 3,
  IN_PROGRESS: 3,
  DONE: 4,
  PROBLEM_REPORTED: 4,
  CONFIRMED: 5,
  CANCELLED: null,
};

export type TimelineStep = {
  label: string;
  /** done: finished. current: what's happening now. upcoming: not started. */
  state: "done" | "current" | "upcoming";
  /** When a finished step happened. */
  at: Date | null;
};

type TrackedOrder = {
  status: OrderStatus;
  createdAt: Date;
  events: readonly { toStatus: OrderStatus; createdAt: Date }[];
};

/** The timeline for an order, or null if it was cancelled. */
export function trackingTimeline(order: TrackedOrder): TimelineStep[] | null {
  const reached = REACHED[order.status];
  if (reached === null) return null;

  return TRACKING_STEPS.map((step, i) => {
    const state = i <= reached ? "done" : i === reached + 1 ? "current" : "upcoming";
    if (state !== "done") return { label: step.label, state, at: null };
    // "Request received" is when the order was created: a declined offer also moves it back to
    // New, which shouldn't change that date. Other steps use their latest event, since a return
    // visit repeats them.
    const at =
      i === 0
        ? order.createdAt
        : (order.events.findLast((e) => e.toStatus === step.status)?.createdAt ?? null);
    return { label: step.label, state, at };
  });
}
