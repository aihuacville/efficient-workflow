"use client";

import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import { useState } from "react";
import { RatingForm, type RatingInput } from "@/components/RatingForm";
import { ReviewList } from "@/components/ReviewList";

/** Sends the rating to the server and returns the server's thank-you message. */
async function sendRating(rating: RatingInput): Promise<string> {
  const res = await fetch("/api/ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rating),
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Couldn't send your rating. Please try again.");
  return data.message ?? "";
}

/** Demo-only switch to show the rating before the real "You confirmed" step exists. */
export function RatingDemo() {
  const [show, setShow] = useState(false);
  // Counts ratings sent; each new one reloads the review list.
  const [sent, setSent] = useState(0);

  async function submit(rating: RatingInput) {
    const message = await sendRating(rating);
    setSent((n) => n + 1);
    return message;
  }

  return (
    <Stack spacing={2}>
      <FormControlLabel
        control={<Switch checked={show} onChange={(e) => setShow(e.target.checked)} />}
        label="Demo: show rating"
      />
      {show && <RatingForm businessName="ABC Fire Safety" onSubmit={submit} />}
      {show && sent > 0 && <ReviewList refreshKey={sent} />}
    </Stack>
  );
}
