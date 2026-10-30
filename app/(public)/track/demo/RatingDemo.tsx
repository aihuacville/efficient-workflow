"use client";

import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import { useState } from "react";
import { sendRating } from "@/components/OrderRating";
import { RatingForm, type RatingInput } from "@/components/RatingForm";
import { ReviewList } from "@/components/ReviewList";

/** Demo-only switch to show the rating before the real "You confirmed" step exists. */
export function RatingDemo({
  trackingToken,
  business,
}: {
  trackingToken: string;
  business: { id: string; name: string };
}) {
  const [show, setShow] = useState(false);
  // Counts ratings sent; each new one reloads the review list.
  const [sent, setSent] = useState(0);

  async function submit(rating: RatingInput) {
    const message = await sendRating(trackingToken, rating);
    setSent((n) => n + 1);
    return message;
  }

  return (
    <Stack spacing={2}>
      <FormControlLabel
        control={<Switch checked={show} onChange={(e) => setShow(e.target.checked)} />}
        label="Demo: show rating"
      />
      {show && <RatingForm businessName={business.name} onSubmit={submit} />}
      {show && sent > 0 && <ReviewList businessId={business.id} refreshKey={sent} />}
    </Stack>
  );
}
