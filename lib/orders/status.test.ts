import { describe, expect, it } from "vitest";
import {
  ACTIONS,
  type Action,
  type ActionInput,
  type Actor,
  allowedMoves,
  checkAction,
  nextActions,
  ORDER_STATUSES,
  type OrderState,
  STATUS_LABELS,
} from "./status";

// Two businesses, so we can check one never acts on the other's jobs.
const dispatcher: Actor = { kind: "staff", id: "u_disp", role: "DISPATCHER", businessId: null };
const owner: Actor = { kind: "staff", id: "u_owner", role: "OWNER", businessId: "b_lawn" };
const otherOwner: Actor = { kind: "staff", id: "u_other", role: "OWNER", businessId: "b_other" };
const tech: Actor = { kind: "staff", id: "u_tech", role: "TECHNICIAN", businessId: "b_lawn" };
const otherTech: Actor = { kind: "staff", id: "u_tech2", role: "TECHNICIAN", businessId: "b_lawn" };
const customer: Actor = { kind: "customer" };

const visit: ActionInput = {
  technician: { id: "u_tech", role: "TECHNICIAN", businessId: "b_lawn" },
  visitStart: new Date("2026-11-02T09:00:00Z"),
};

// What a job looks like at each status on the normal path.
function orderAt(status: OrderState["status"]): OrderState {
  if (status === "NEW") return { status, businessId: null, technicianId: null };
  if (status === "OFFERED" || status === "ACCEPTED") {
    return { status, businessId: "b_lawn", technicianId: null };
  }
  return { status, businessId: "b_lawn", technicianId: "u_tech" };
}

describe("the normal path", () => {
  it("goes from request to confirmation, each step by the right person", () => {
    const steps: [Action, Actor, ActionInput?][] = [
      ["offer", dispatcher, { businessId: "b_lawn" }],
      ["accept", owner],
      ["schedule", owner, visit],
      ["startTrip", tech],
      ["startWork", tech],
      ["finish", tech],
      ["confirm", customer],
    ];
    let order = orderAt("NEW");
    for (const [action, actor, input] of steps) {
      const result = checkAction(order, action, actor, input);
      if (!result.ok) throw new Error(`${action}: ${result.error}`);
      order = { ...order, ...result.changes };
    }
    expect(order).toMatchObject({
      status: "CONFIRMED",
      businessId: "b_lawn",
      technicianId: "u_tech",
    });
  });

  it("saves the business when offered, and the technician and time when scheduled", () => {
    expect(checkAction(orderAt("NEW"), "offer", dispatcher, { businessId: "b_lawn" })).toEqual({
      ok: true,
      changes: { status: "OFFERED", businessId: "b_lawn" },
    });
    expect(checkAction(orderAt("ACCEPTED"), "schedule", owner, visit)).toEqual({
      ok: true,
      changes: { status: "SCHEDULED", technicianId: "u_tech", visitStart: visit.visitStart },
    });
  });
});

describe("the full table of moves", () => {
  // The workflow written out by hand. If a rule changes, this list must change too, on purpose.
  const expected = [
    "NEW → OFFERED",
    "NEW → CANCELLED",
    "OFFERED → NEW",
    "OFFERED → ACCEPTED",
    "OFFERED → CANCELLED",
    "ACCEPTED → SCHEDULED",
    "ACCEPTED → CANCELLED",
    "SCHEDULED → ON_THE_WAY",
    "SCHEDULED → DONE",
    "SCHEDULED → CANCELLED",
    "ON_THE_WAY → IN_PROGRESS",
    "ON_THE_WAY → DONE",
    "IN_PROGRESS → DONE",
    "DONE → CONFIRMED",
    "DONE → PROBLEM_REPORTED",
    "PROBLEM_REPORTED → SCHEDULED",
    "PROBLEM_REPORTED → CANCELLED",
  ];

  it("allows exactly these from → to moves, and none of the other 100 pairs", () => {
    const actual = new Set(allowedMoves().map((m) => `${m.from} → ${m.to}`));
    expect([...actual].sort()).toEqual([...expected].sort());
  });

  it("refuses every action from a status it doesn't start from, whoever asks", () => {
    const people = [dispatcher, owner, tech, customer];
    for (const status of ORDER_STATUSES) {
      for (const action of ACTIONS) {
        const startsHere = allowedMoves().some((m) => m.action === action && m.from === status);
        if (startsHere) continue;
        for (const actor of people) {
          const result = checkAction(orderAt(status), action, actor, {
            businessId: "b_lawn",
            note: "x",
            ...visit,
          });
          expect(result.ok, `${action} from ${status}`).toBe(false);
        }
      }
    }
  });

  it("has no way out of Confirmed or Cancelled", () => {
    for (const status of ["CONFIRMED", "CANCELLED"] as const) {
      expect(allowedMoves().filter((m) => m.from === status)).toEqual([]);
      for (const actor of [dispatcher, owner, tech, customer]) {
        expect(nextActions(orderAt(status), actor)).toEqual([]);
      }
    }
  });

  it("gives every status a customer-facing label", () => {
    expect(ORDER_STATUSES).toHaveLength(10);
    for (const status of ORDER_STATUSES) expect(STATUS_LABELS[status]).toBeTruthy();
  });
});

describe("who may do what", () => {
  it("lets only a dispatcher offer and cancel", () => {
    for (const actor of [owner, tech, customer]) {
      expect(checkAction(orderAt("NEW"), "offer", actor, { businessId: "b_lawn" }).ok).toBe(false);
      expect(checkAction(orderAt("NEW"), "cancel", actor).ok).toBe(false);
    }
  });

  it("doesn't let customers cancel (not yet)", () => {
    for (const status of ORDER_STATUSES) {
      expect(nextActions(orderAt(status), customer).map((a) => a.action)).not.toContain("cancel");
    }
  });

  it("refuses an owner from another business", () => {
    for (const [status, action, input] of [
      ["OFFERED", "accept", {}],
      ["OFFERED", "decline", {}],
      ["ACCEPTED", "schedule", visit],
      ["IN_PROGRESS", "markDone", {}],
    ] as const) {
      const result = checkAction(orderAt(status), action, otherOwner, input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/^Only the business with this job can do/);
    }
  });

  it("lets only the assigned technician move the job along", () => {
    for (const actor of [otherTech, owner, dispatcher, customer]) {
      expect(checkAction(orderAt("SCHEDULED"), "startTrip", actor).ok).toBe(false);
      expect(checkAction(orderAt("ON_THE_WAY"), "startWork", actor).ok).toBe(false);
      expect(checkAction(orderAt("IN_PROGRESS"), "finish", actor).ok).toBe(false);
    }
  });

  it("refuses a technician who tries to accept a job", () => {
    expect(checkAction(orderAt("OFFERED"), "accept", tech)).toEqual({
      ok: false,
      error: 'Only the business with this job can do "Accept".',
    });
  });

  it("lets only the customer confirm or report a problem", () => {
    for (const actor of [dispatcher, owner, tech]) {
      expect(checkAction(orderAt("DONE"), "confirm", actor).ok).toBe(false);
      expect(
        checkAction(orderAt("DONE"), "reportProblem", actor, { note: "Grass not cut" }).ok,
      ).toBe(false);
    }
  });
});

describe("owner override", () => {
  it("lets the owner mark a job done if the technician forgot", () => {
    for (const status of ["SCHEDULED", "ON_THE_WAY", "IN_PROGRESS"] as const) {
      expect(checkAction(orderAt(status), "markDone", owner)).toEqual({
        ok: true,
        changes: { status: "DONE" },
      });
    }
  });

  it("doesn't let the technician skip steps with Mark done", () => {
    expect(checkAction(orderAt("SCHEDULED"), "markDone", tech).ok).toBe(false);
  });
});

describe("declining and withdrawing", () => {
  it("sends a declined job back to the dispatcher's queue with no business", () => {
    expect(checkAction(orderAt("OFFERED"), "decline", owner)).toEqual({
      ok: true,
      changes: { status: "NEW", businessId: null, technicianId: null },
    });
  });

  it("does the same when the dispatcher withdraws the offer", () => {
    expect(checkAction(orderAt("OFFERED"), "withdraw", dispatcher)).toEqual({
      ok: true,
      changes: { status: "NEW", businessId: null, technicianId: null },
    });
  });

  it("refuses the owner once the job has gone back to the queue", () => {
    expect(checkAction(orderAt("NEW"), "accept", owner).ok).toBe(false);
  });
});

describe("required details", () => {
  it("needs a business to offer the job", () => {
    expect(checkAction(orderAt("NEW"), "offer", dispatcher)).toEqual({
      ok: false,
      error: "Choose a business to offer the job to.",
    });
  });

  it("needs a technician and a time to schedule", () => {
    const order = orderAt("ACCEPTED");
    expect(checkAction(order, "schedule", owner, { visitStart: visit.visitStart })).toEqual({
      ok: false,
      error: "Choose a technician.",
    });
    expect(checkAction(order, "schedule", owner, { technician: visit.technician })).toEqual({
      ok: false,
      error: "Choose a visit time.",
    });
  });

  it("refuses a technician from another business, or a dispatcher, as the visitor", () => {
    const order = orderAt("ACCEPTED");
    for (const technician of [
      { id: "u_x", role: "TECHNICIAN", businessId: "b_other" },
      { id: "u_disp", role: "DISPATCHER", businessId: null },
    ] as const) {
      expect(checkAction(order, "schedule", owner, { ...visit, technician })).toEqual({
        ok: false,
        error: "That person doesn't work for this business.",
      });
    }
  });

  it("lets an owner schedule themselves", () => {
    const self = { id: "u_owner", role: "OWNER", businessId: "b_lawn" } as const;
    expect(
      checkAction(orderAt("ACCEPTED"), "schedule", owner, { ...visit, technician: self }).ok,
    ).toBe(true);
  });

  it("needs a description to report a problem", () => {
    for (const note of [undefined, "", "   "]) {
      expect(checkAction(orderAt("DONE"), "reportProblem", customer, { note })).toEqual({
        ok: false,
        error: "Tell us what went wrong.",
      });
    }
  });

  it("books a return visit after a problem", () => {
    expect(checkAction(orderAt("PROBLEM_REPORTED"), "rebook", owner, visit).ok).toBe(true);
  });
});

describe("buttons for each person (nextActions)", () => {
  const buttons = (status: OrderState["status"], actor: Actor) =>
    nextActions(orderAt(status), actor).map((a) => a.label);

  it("shows each person only what they can do", () => {
    expect(buttons("NEW", dispatcher)).toEqual(["Offer to business", "Cancel job"]);
    expect(buttons("OFFERED", dispatcher)).toEqual(["Withdraw offer", "Cancel job"]);
    expect(buttons("OFFERED", owner)).toEqual(["Accept", "Decline"]);
    expect(buttons("OFFERED", otherOwner)).toEqual([]);
    expect(buttons("ACCEPTED", owner)).toEqual(["Schedule visit"]);
    expect(buttons("SCHEDULED", tech)).toEqual(["On my way"]);
    expect(buttons("SCHEDULED", owner)).toEqual(["Mark done"]);
    expect(buttons("ON_THE_WAY", tech)).toEqual(["Start work"]);
    expect(buttons("IN_PROGRESS", tech)).toEqual(["Done"]);
    expect(buttons("DONE", customer)).toEqual(["Confirm the work is done", "Report a problem"]);
    expect(buttons("DONE", tech)).toEqual([]);
    expect(buttons("PROBLEM_REPORTED", owner)).toEqual(["Book a return visit"]);
  });

  it("agrees with checkAction: every button shown is allowed", () => {
    const input = { businessId: "b_lawn", note: "x", ...visit };
    for (const status of ORDER_STATUSES) {
      for (const actor of [dispatcher, owner, otherOwner, tech, otherTech, customer]) {
        for (const { action } of nextActions(orderAt(status), actor)) {
          expect(checkAction(orderAt(status), action, actor, input).ok).toBe(true);
        }
      }
    }
  });
});
