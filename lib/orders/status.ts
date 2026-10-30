import type { OrderStatus, Role } from "@/lib/generated/prisma/enums";

// The order workflow: which status changes are allowed, and who may make them.
// Pure rules with no database access, so pages, API routes and tests all use the same ones.
// Saving a change (with its OrderEvent) happens in lib/orders/transition.ts.

/**
 * Who is acting. Customers don't sign in: they act through their tracking link, so the code
 * that loads the order by its tracking token has already checked it's their order.
 */
export type Actor =
  { kind: "staff"; id: string; role: Role; businessId: string | null } | { kind: "customer" };

/** The parts of an order the rules look at. */
export type OrderState = {
  status: OrderStatus;
  businessId: string | null;
  technicianId: string | null;
};

/** Details some actions need. */
export type ActionInput = {
  /** offer: the business the dispatcher chose. */
  businessId?: string;
  /** schedule, rebook: who does the visit, as loaded from the database. */
  technician?: { id: string; role: Role; businessId: string | null };
  /** schedule, rebook: when the visit starts. */
  visitStart?: Date;
  /** decline: optional reason. reportProblem: what went wrong (required). */
  note?: string;
};

/** The fields to save on the order when an action succeeds. */
export type OrderChanges = {
  status: OrderStatus;
  businessId?: string | null;
  technicianId?: string | null;
  visitStart?: Date;
};

/**
 * Why an action was refused. status: not possible at this stage. person: this person can't do
 * it. input: a required detail is missing or wrong.
 */
export type RefusalReason = "status" | "person" | "input";

export type CheckResult =
  { ok: true; changes: OrderChanges } | { ok: false; reason: RefusalReason; error: string };

/**
 * dispatcher: any platform dispatcher. owner: an owner of the business the job is offered to.
 * technician: the person assigned to the job. customer: the customer, via the tracking link.
 */
type Who = "dispatcher" | "owner" | "technician" | "customer";

type Rule = {
  from: readonly OrderStatus[];
  to: OrderStatus;
  who: readonly Who[];
  /** Button text. */
  label: string;
  /** Returns what's missing from the input, if anything. */
  check?: (input: ActionInput, order: OrderState) => string | undefined;
  /** Other fields to change besides the status. */
  changes?: (input: ActionInput) => Omit<OrderChanges, "status">;
};

/** Customer-facing name of each status. TypeScript makes sure every status has one. */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Request received",
  OFFERED: "Finding a business",
  ACCEPTED: "Business assigned",
  SCHEDULED: "Visit scheduled",
  ON_THE_WAY: "Technician on the way",
  IN_PROGRESS: "Work in progress",
  DONE: "Work done",
  CONFIRMED: "Confirmed",
  PROBLEM_REPORTED: "Problem reported",
  CANCELLED: "Cancelled",
};

/** Short names for staff pages, where "Offered" means more than "Finding a business". */
export const STAFF_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "New",
  OFFERED: "Offered",
  ACCEPTED: "Accepted",
  SCHEDULED: "Scheduled",
  ON_THE_WAY: "On the way",
  IN_PROGRESS: "In progress",
  DONE: "Done, awaiting customer",
  CONFIRMED: "Confirmed",
  PROBLEM_REPORTED: "Problem reported",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUSES = Object.keys(STATUS_LABELS) as OrderStatus[];

const WHO_TEXT: Record<Who, string> = {
  dispatcher: "a dispatcher",
  owner: "the business with this job",
  technician: "the assigned technician",
  customer: "the customer",
};

function checkVisit(input: ActionInput, order: OrderState) {
  const person = input.technician;
  if (!person) return "Choose a technician.";
  // Owners can send themselves: many small businesses are owner-operated.
  const canVisit = person.role === "TECHNICIAN" || person.role === "OWNER";
  if (!canVisit || person.businessId !== order.businessId) {
    return "That person doesn't work for this business.";
  }
  if (!input.visitStart) return "Choose a visit time.";
}

const visitChanges = (input: ActionInput) => ({
  technicianId: input.technician?.id,
  visitStart: input.visitStart,
});

// Declining or withdrawing an offer sends the job back to the dispatcher's queue.
const backToQueue = () => ({ businessId: null, technicianId: null });

const RULES = {
  offer: {
    from: ["NEW"],
    to: "OFFERED",
    who: ["dispatcher"],
    label: "Offer to business",
    check: (input) => (input.businessId ? undefined : "Choose a business to offer the job to."),
    changes: (input) => ({ businessId: input.businessId }),
  },
  withdraw: {
    from: ["OFFERED"],
    to: "NEW",
    who: ["dispatcher"],
    label: "Withdraw offer",
    changes: backToQueue,
  },
  accept: { from: ["OFFERED"], to: "ACCEPTED", who: ["owner"], label: "Accept" },
  decline: { from: ["OFFERED"], to: "NEW", who: ["owner"], label: "Decline", changes: backToQueue },
  schedule: {
    from: ["ACCEPTED"],
    to: "SCHEDULED",
    who: ["owner"],
    label: "Schedule visit",
    check: checkVisit,
    changes: visitChanges,
  },
  startTrip: { from: ["SCHEDULED"], to: "ON_THE_WAY", who: ["technician"], label: "On my way" },
  startWork: { from: ["ON_THE_WAY"], to: "IN_PROGRESS", who: ["technician"], label: "Start work" },
  finish: { from: ["IN_PROGRESS"], to: "DONE", who: ["technician"], label: "Done" },
  // The owner's override when the technician forgets to update the job.
  markDone: {
    from: ["SCHEDULED", "ON_THE_WAY", "IN_PROGRESS"],
    to: "DONE",
    who: ["owner"],
    label: "Mark done",
  },
  confirm: {
    from: ["DONE"],
    to: "CONFIRMED",
    who: ["customer"],
    label: "Confirm the work is done",
  },
  reportProblem: {
    from: ["DONE"],
    to: "PROBLEM_REPORTED",
    who: ["customer"],
    label: "Report a problem",
    check: (input) => (input.note?.trim() ? undefined : "Tell us what went wrong."),
  },
  rebook: {
    from: ["PROBLEM_REPORTED"],
    to: "SCHEDULED",
    who: ["owner"],
    label: "Book a return visit",
    check: checkVisit,
    changes: visitChanges,
  },
  // Customers can't cancel yet; the tracking page tells them to get in touch instead.
  cancel: {
    from: ["NEW", "OFFERED", "ACCEPTED", "SCHEDULED", "PROBLEM_REPORTED"],
    to: "CANCELLED",
    who: ["dispatcher"],
    label: "Cancel job",
  },
} satisfies Record<string, Rule>;

export type Action = keyof typeof RULES;

export const ACTIONS = Object.keys(RULES) as Action[];

function isWho(who: Who, order: OrderState, actor: Actor) {
  if (actor.kind === "customer") return who === "customer";
  switch (who) {
    case "dispatcher":
      return actor.role === "DISPATCHER";
    case "owner":
      return (
        actor.role === "OWNER" && actor.businessId !== null && actor.businessId === order.businessId
      );
    case "technician":
      return order.technicianId !== null && actor.id === order.technicianId;
    case "customer":
      return false;
  }
}

/** Whether `actor` may do `action` on this order now, and if so, what to save. */
export function checkAction(
  order: OrderState,
  action: Action,
  actor: Actor,
  input: ActionInput = {},
): CheckResult {
  const rule: Rule = RULES[action];
  if (!rule.from.includes(order.status)) {
    return {
      ok: false,
      reason: "status",
      error: `"${rule.label}" isn't possible now: this job is at "${STATUS_LABELS[order.status]}".`,
    };
  }
  if (!rule.who.some((who) => isWho(who, order, actor))) {
    return {
      ok: false,
      reason: "person",
      error: `Only ${rule.who.map((who) => WHO_TEXT[who]).join(" or ")} can do "${rule.label}".`,
    };
  }
  const missing = rule.check?.(input, order);
  if (missing) return { ok: false, reason: "input", error: missing };
  return { ok: true, changes: { status: rule.to, ...rule.changes?.(input) } };
}

/** The buttons to show this person for this order, in workflow order. */
export function nextActions(order: OrderState, actor: Actor) {
  return ACTIONS.filter((action) => {
    const rule: Rule = RULES[action];
    return rule.from.includes(order.status) && rule.who.some((who) => isWho(who, order, actor));
  }).map((action) => ({ action, label: RULES[action].label }));
}

/** Every from → to move the workflow allows. Used by tests and docs. */
export function allowedMoves() {
  return ACTIONS.flatMap((action) => {
    const rule: Rule = RULES[action];
    return rule.from.map((from) => ({ action, from, to: rule.to }));
  });
}
