import { describe, expect, it } from "vitest";
import { safePath, safeUrl } from "./analytics";

describe("safePath", () => {
  it("hides the token in a tracking link", () => {
    expect(safePath("/track/abc123")).toBe("/track/:token");
    expect(safePath("/track/abc123/extra")).toBe("/track/:token/extra");
  });

  it("leaves other pages alone", () => {
    expect(safePath("/")).toBe("/");
    expect(safePath("/request")).toBe("/request");
    expect(safePath("/privacy")).toBe("/privacy");
  });
});

describe("safeUrl", () => {
  it("cleans the path and drops the query string and hash", () => {
    expect(safeUrl("https://example.com/track/abc123?x=1#top")).toBe(
      "https://example.com/track/:token",
    );
  });

  it("returns an empty string when there's no URL", () => {
    expect(safeUrl("")).toBe("");
  });
});
