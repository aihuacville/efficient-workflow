import { describe, expect, it } from "vitest";
import { type Candidate, rankCandidates, score } from "./index";

const base: Candidate = {
  businessId: "b",
  distanceMeters: 0,
  rating: 5,
  capacityAvailable: 1,
  acceptanceRate: 1,
};

describe("score", () => {
  it("is 1 for a perfect candidate with default weights", () => {
    expect(score(base)).toBeCloseTo(1);
  });

  it("clamps out-of-range inputs", () => {
    expect(score({ ...base, rating: 9, acceptanceRate: 2 })).toBeCloseTo(1);
  });
});

describe("rankCandidates", () => {
  it("prefers nearer businesses when everything else is equal", () => {
    const ranked = rankCandidates([
      { ...base, businessId: "far", distanceMeters: 30_000 },
      { ...base, businessId: "near", distanceMeters: 2_000 },
    ]);
    expect(ranked.map((c) => c.businessId)).toEqual(["near", "far"]);
  });

  it("drops candidates outside the radius or without capacity", () => {
    const ranked = rankCandidates([
      { ...base, businessId: "out", distanceMeters: 50_000 },
      { ...base, businessId: "full", capacityAvailable: 0 },
      { ...base, businessId: "ok" },
    ]);
    expect(ranked.map((c) => c.businessId)).toEqual(["ok"]);
  });

  it("breaks ties deterministically", () => {
    const ranked = rankCandidates([
      { ...base, businessId: "z" },
      { ...base, businessId: "a" },
    ]);
    expect(ranked.map((c) => c.businessId)).toEqual(["a", "z"]);
  });
});
