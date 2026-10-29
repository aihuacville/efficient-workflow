// Checks a rating sent by the browser. No database access, so it's tested on its own.

export const MAX_COMMENT = 500;

export type NewRating = { trackingToken: string; stars: number; comment: string };

/** Never trust the browser: anyone can call the API directly, so check every field. */
export function parseRating(
  body: unknown,
): { ok: true; rating: NewRating } | { ok: false; error: string } {
  const {
    trackingToken,
    stars,
    comment = "",
  } = (body ?? {}) as { trackingToken?: unknown; stars?: unknown; comment?: unknown };

  if (typeof trackingToken !== "string" || !trackingToken) {
    return {
      ok: false,
      error: "trackingToken is missing: it's the code at the end of the tracking link",
    };
  }
  if (typeof stars !== "number" || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { ok: false, error: "stars must be a whole number from 1 to 5" };
  }
  if (typeof comment !== "string") {
    return { ok: false, error: "comment must be text" };
  }
  if (comment.length > MAX_COMMENT) {
    return { ok: false, error: `comment must be ${MAX_COMMENT} characters or fewer` };
  }
  return { ok: true, rating: { trackingToken, stars, comment: comment.trim() } };
}
