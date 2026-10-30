import { describe, expect, it } from "vitest";
import { formatDate, timeAgo } from "./format";

describe("formatDate", () => {
  it("shows a deadline as the date that was entered", () => {
    expect(formatDate(new Date("2026-11-15T12:00:00Z"))).toBe("Nov 15, 2026");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-10-30T12:00:00Z");
  const ago = (ms: number) => timeAgo(new Date(now.getTime() - ms), now);

  it("says how long ago, in the largest sensible unit", () => {
    expect(ago(20_000)).toBe("just now");
    expect(ago(5 * 60_000)).toBe("5 minutes ago");
    expect(ago(3 * 3_600_000)).toBe("3 hours ago");
    expect(ago(26 * 3_600_000)).toBe("yesterday");
    expect(ago(4 * 86_400_000)).toBe("4 days ago");
  });
});
