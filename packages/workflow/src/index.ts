/**
 * Order lifecycle state machine. See README → "Order Lifecycle".
 * Every status change must go through `assertTransition` on the server.
 */

export const ORDER_STATUSES = [
  "SUBMITTED",
  "PROCESSING",
  "DISPATCHING",
  "ACCEPTED",
  "SCHEDULED",
  "FINISHED",
  "VERIFIED",
  "PAYMENT_REQUESTED",
  "PAID",
  "PAYMENT_RECEIVED",
  "CLOSED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type Actor = "customer" | "system" | "owner" | "staff" | "admin" | "payment_webhook";

type Transition = { to: OrderStatus; by: readonly Actor[] };

const TRANSITIONS: Record<OrderStatus, readonly Transition[]> = {
  SUBMITTED: [
    { to: "PROCESSING", by: ["system"] },
    { to: "CANCELLED", by: ["customer", "admin"] },
  ],
  PROCESSING: [
    { to: "DISPATCHING", by: ["system", "admin"] },
    { to: "CANCELLED", by: ["customer", "admin"] },
  ],
  DISPATCHING: [
    // Self-transition: declined / timed out → offer to the next candidate.
    { to: "DISPATCHING", by: ["system", "admin"] },
    { to: "ACCEPTED", by: ["owner", "admin"] },
    { to: "CANCELLED", by: ["customer", "admin"] },
  ],
  ACCEPTED: [{ to: "SCHEDULED", by: ["owner", "staff", "admin"] }],
  SCHEDULED: [{ to: "FINISHED", by: ["owner", "staff"] }],
  FINISHED: [
    { to: "VERIFIED", by: ["customer"] },
    // Customer disputes → rework.
    { to: "SCHEDULED", by: ["customer", "admin"] },
  ],
  VERIFIED: [{ to: "PAYMENT_REQUESTED", by: ["system"] }],
  PAYMENT_REQUESTED: [{ to: "PAID", by: ["payment_webhook"] }],
  PAID: [{ to: "PAYMENT_RECEIVED", by: ["payment_webhook"] }],
  PAYMENT_RECEIVED: [{ to: "CLOSED", by: ["system"] }],
  CLOSED: [],
  CANCELLED: [],
};

export function nextStatuses(from: OrderStatus, actor?: Actor): OrderStatus[] {
  return TRANSITIONS[from].filter((t) => !actor || t.by.includes(actor)).map((t) => t.to);
}

export function canTransition(from: OrderStatus, to: OrderStatus, actor: Actor): boolean {
  return TRANSITIONS[from].some((t) => t.to === to && t.by.includes(actor));
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: OrderStatus,
    readonly to: OrderStatus,
    readonly actor: Actor,
  ) {
    super(`${actor} cannot move an order from ${from} to ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: OrderStatus, to: OrderStatus, actor: Actor): void {
  if (!canTransition(from, to, actor)) throw new InvalidTransitionError(from, to, actor);
}

export function isTerminal(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/** Customer-facing label for each status, used on the tracking page. */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  SUBMITTED: "Request received",
  PROCESSING: "Reviewing your request",
  DISPATCHING: "Finding a business",
  ACCEPTED: "Business accepted",
  SCHEDULED: "Scheduled",
  FINISHED: "Work finished, please verify",
  VERIFIED: "Verified",
  PAYMENT_REQUESTED: "Payment requested",
  PAID: "Paid",
  PAYMENT_RECEIVED: "Payment received",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

/** The happy path, in order. Used to draw the progress stepper. */
export const HAPPY_PATH: readonly OrderStatus[] = ORDER_STATUSES.filter((s) => s !== "CANCELLED");
