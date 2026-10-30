"use client";

import Paper from "@mui/material/Paper";
import Rating from "@mui/material/Rating";
import Typography from "@mui/material/Typography";
import { RatingForm, type RatingInput } from "@/components/RatingForm";

/** Sends the customer's rating of their job and returns the server's thank-you message. */
export async function sendRating(trackingToken: string, rating: RatingInput): Promise<string> {
  const res = await fetch("/api/ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackingToken, ...rating }),
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Couldn't send your rating. Please try again.");
  return data.message ?? "";
}

/** The rating on the tracking page: the form, or the customer's rating once they've sent one. */
export function OrderRating({
  trackingToken,
  businessName,
  rating,
}: {
  trackingToken: string;
  businessName: string;
  rating: { stars: number; comment: string } | null;
}) {
  if (rating) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography fontWeight={600}>Your rating of {businessName}</Typography>
        <Rating value={rating.stars} readOnly sx={{ mt: 1 }} />
        {rating.comment && (
          <Typography sx={{ mt: 1, overflowWrap: "anywhere" }}>{rating.comment}</Typography>
        )}
      </Paper>
    );
  }
  return <RatingForm businessName={businessName} onSubmit={(r) => sendRating(trackingToken, r)} />;
}
