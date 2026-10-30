import { describe, expect, it } from "vitest";
import type { OrderStatus } from "@/lib/generated/prisma/enums";
import { trackingTimeline } from "./tracking";

const day = (n: number) => new Date(`2026-11-0${n}T15:00:00Z`);

const states = (status: OrderStatus) =>
  trackingTimeline({ status, createdAt: day(1), events: [] })?.map((s) => s.state);

describe("trackingTimeline", () => {
  it("shows a new request as received, with a business being found next", () => {
    expect(states("NEW")).toEqual([
      "done",
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
  });

  it("keeps an offered job at 'finding a business' for the customer", () => {
    expect(states("OFFERED")).toEqual(states("NEW"));
  });

  it("moves along as the job progresses", () => {
    expect(states("SCHEDULED")).toEqual([
      "done",
      "done",
      "done",
      "current",
      "upcoming",
      "upcoming",
    ]);
    expect(states("IN_PROGRESS")).toEqual(["done", "done", "done", "done", "current", "upcoming"]);
    expect(states("DONE")).toEqual(["done", "done", "done", "done", "done", "current"]);
  });

  it("shows every step done once the customer confirms", () => {
    expect(states("CONFIRMED")).toEqual(Array(6).fill("done"));
  });

  it("waits at 'You confirm' after a problem is reported", () => {
    expect(states("PROBLEM_REPORTED")).toEqual(states("DONE"));
  });

  it("has no timeline for a cancelled order", () => {
    expect(trackingTimeline({ status: "CANCELLED", createdAt: day(1), events: [] })).toBeNull();
  });

  it("dates later steps from their latest event, so a decline doesn't move the request date", () => {
    const timeline = trackingTimeline({
      status: "SCHEDULED",
      createdAt: day(1),
      events: [
        { toStatus: "NEW", createdAt: day(1) },
        { toStatus: "OFFERED", createdAt: day(2) },
        { toStatus: "NEW", createdAt: day(3) }, // declined, back to the queue
        { toStatus: "OFFERED", createdAt: day(4) },
        { toStatus: "ACCEPTED", createdAt: day(5) },
        { toStatus: "SCHEDULED", createdAt: day(6) },
      ],
    });
    expect(timeline?.map((s) => s.at)).toEqual([day(1), day(5), day(6), null, null, null]);
  });

  it("dates 'Request received' from the order, even with no events (like the demo data)", () => {
    expect(trackingTimeline({ status: "NEW", createdAt: day(1), events: [] })?.[0]?.at).toEqual(
      day(1),
    );
  });
});
