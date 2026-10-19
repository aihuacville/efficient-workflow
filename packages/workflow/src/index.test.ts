import { describe, expect, it } from "vitest";
import {
  HAPPY_PATH,
  ORDER_STATUSES,
  assertTransition,
  canTransition,
  isTerminal,
  nextStatuses,
} from "./index";

describe("order state machine", () => {
  it("allows the system to start processing a submitted order", () => {
    expect(canTransition("SUBMITTED", "PROCESSING", "system")).toBe(true);
  });

  it("rejects skipping states", () => {
    expect(canTransition("SUBMITTED", "ACCEPTED", "owner")).toBe(false);
  });

  it("rejects the wrong actor", () => {
    expect(canTransition("FINISHED", "VERIFIED", "owner")).toBe(false);
    expect(() => assertTransition("FINISHED", "VERIFIED", "staff")).toThrow(/staff cannot/);
  });

  it("only lets payment webhooks mark an order paid", () => {
    expect(nextStatuses("PAYMENT_REQUESTED", "customer")).toEqual([]);
    expect(nextStatuses("PAYMENT_REQUESTED", "payment_webhook")).toEqual(["PAID"]);
  });

  it("supports dispute → rework", () => {
    expect(canTransition("FINISHED", "SCHEDULED", "customer")).toBe(true);
  });

  it("can cancel only before a business accepts", () => {
    const cancellable = ORDER_STATUSES.filter((s) => canTransition(s, "CANCELLED", "admin"));
    expect(cancellable).toEqual(["SUBMITTED", "PROCESSING", "DISPATCHING"]);
  });

  it("walks the full happy path", () => {
    for (let i = 0; i < HAPPY_PATH.length - 1; i++) {
      expect(nextStatuses(HAPPY_PATH[i]!)).toContain(HAPPY_PATH[i + 1]);
    }
    expect(isTerminal("CLOSED")).toBe(true);
    expect(isTerminal("CANCELLED")).toBe(true);
  });
});
