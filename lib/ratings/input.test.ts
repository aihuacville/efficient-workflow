import { describe, expect, it } from "vitest";
import { MAX_COMMENT, parseRating } from "./input";

describe("parseRating", () => {
  it("accepts a rating and trims the comment", () => {
    expect(parseRating({ trackingToken: "demo", stars: 4, comment: "  On time.  " })).toEqual({
      ok: true,
      rating: { trackingToken: "demo", stars: 4, comment: "On time." },
    });
  });

  it("treats the comment as optional", () => {
    expect(parseRating({ trackingToken: "demo", stars: 5 })).toEqual({
      ok: true,
      rating: { trackingToken: "demo", stars: 5, comment: "" },
    });
  });

  it("needs the tracking token", () => {
    for (const trackingToken of [undefined, "", 42]) {
      const result = parseRating({ trackingToken, stars: 5 });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/^trackingToken is missing/);
    }
  });

  it("refuses stars that aren't a whole number from 1 to 5", () => {
    for (const stars of [0, 6, 3.5, "5", null, undefined]) {
      expect(parseRating({ trackingToken: "demo", stars })).toEqual({
        ok: false,
        error: "stars must be a whole number from 1 to 5",
      });
    }
  });

  it("refuses a comment that isn't text, or is too long", () => {
    expect(parseRating({ trackingToken: "demo", stars: 5, comment: 7 })).toEqual({
      ok: false,
      error: "comment must be text",
    });
    expect(
      parseRating({ trackingToken: "demo", stars: 5, comment: "a".repeat(MAX_COMMENT + 1) }).ok,
    ).toBe(false);
    expect(
      parseRating({ trackingToken: "demo", stars: 5, comment: "a".repeat(MAX_COMMENT) }).ok,
    ).toBe(true);
  });

  it("refuses a body that isn't an object", () => {
    for (const body of [null, undefined, "hello", 5]) expect(parseRating(body).ok).toBe(false);
  });
});
