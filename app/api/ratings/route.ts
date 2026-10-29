import { parseRating } from "@/lib/ratings/input";
import { listReviews, rateOrder } from "@/lib/ratings/queries";

// Ratings, saved in Postgres. Each rating belongs to a confirmed job; the customer proves it's
// theirs with the job's tracking token, the secret part of their tracking link.

/** GET /api/ratings?businessId=...: a business's reviews, newest first. */
export async function GET(request: Request) {
  const businessId = new URL(request.url).searchParams.get("businessId");
  if (!businessId) {
    return Response.json({ error: "Add ?businessId=... to the URL" }, { status: 400 });
  }
  return Response.json({ ratings: await listReviews(businessId) });
}

/** POST /api/ratings with { "trackingToken": "...", "stars": 1-5, "comment": "optional" }. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send the rating as JSON" }, { status: 400 });
  }

  const parsed = parseRating(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const result = await rateOrder(parsed.rating);
  if (!result.ok) {
    // 404: no job with that token. 409: the job isn't at a stage where it can be rated.
    return Response.json(
      { error: result.error },
      { status: result.reason === "not_found" ? 404 : 409 },
    );
  }

  const { review, changed } = result;
  return Response.json(
    {
      ...review,
      message: changed
        ? `Thanks! Your rating was changed to ${review.stars} stars.`
        : `Thanks! Your ${review.stars}-star rating was saved.`,
    },
    { status: changed ? 200 : 201 },
  );
}
