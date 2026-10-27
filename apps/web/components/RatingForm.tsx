"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Rating from "@mui/material/Rating";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";

export type RatingInput = { stars: number; comment: string };

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"] as const;

/**
 * Five-star rating with an optional comment, shown once the customer confirms the work is done.
 * `onSubmit` saves the rating; until there's a database it only updates this screen.
 */
export function RatingForm({
  businessName,
  onSubmit,
}: {
  businessName: string;
  onSubmit?: (rating: RatingInput) => Promise<void> | void;
}) {
  const [stars, setStars] = useState<number | null>(null);
  const [hover, setHover] = useState(-1);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"open" | "sending" | "sent" | "skipped">("open");

  if (state === "sent") {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography fontWeight={600}>Thanks for your feedback!</Typography>
        <Rating value={stars} readOnly sx={{ mt: 1 }} />
      </Paper>
    );
  }

  if (state === "skipped") {
    return (
      <Button variant="text" onClick={() => setState("open")}>
        Rate {businessName}
      </Button>
    );
  }

  async function send() {
    if (!stars) return;
    setState("sending");
    await onSubmit?.({ stars, comment: comment.trim() });
    setState("sent");
  }

  const shown = hover !== -1 ? hover : (stars ?? 0);

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h2" component="h2">
          How did {businessName} do?
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Rating
            name="stars"
            value={stars}
            onChange={(_, v) => setStars(v)}
            onChangeActive={(_, v) => setHover(v)}
            getLabelText={(v) => `${v} star${v === 1 ? "" : "s"}, ${LABELS[v] ?? ""}`}
            // Each star is at least 44px wide on phones so it's easy to tap.
            sx={{ fontSize: { xs: "2.75rem", md: "2.25rem" } }}
          />
          <Box sx={{ minWidth: 80, color: "text.secondary" }}>{LABELS[shown]}</Box>
        </Stack>
        <TextField
          label="Add a comment (optional)"
          multiline
          minRows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="contained" disabled={!stars || state === "sending"} onClick={send}>
            Send rating
          </Button>
          <Button variant="text" onClick={() => setState("skipped")}>
            Skip
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
