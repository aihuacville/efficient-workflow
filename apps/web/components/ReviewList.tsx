"use client";

import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Rating from "@mui/material/Rating";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Fragment, useEffect, useState } from "react";

type Review = { id: string; stars: number; comment: string; createdAt: string };

/**
 * Every saved review, newest first, loaded from GET /api/ratings.
 * Change `refreshKey` to load the list again, for example after a new rating is sent.
 */
export function ReviewList({ refreshKey = 0 }: { refreshKey?: number }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    fetch("/api/ratings")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<{ ratings: Review[] }>;
      })
      .then((data) => !cancelled && setReviews(data.ratings))
      .catch(() => !cancelled && setError("Couldn't load reviews."));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (error) return <Alert severity="error">{error}</Alert>;

  if (!reviews) {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton width="40%" />
        <Skeleton />
        <Skeleton />
      </Paper>
    );
  }

  if (reviews.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">No reviews yet.</Typography>
      </Paper>
    );
  }

  const average = reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h2" component="h2">
        All reviews
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, mb: 2 }}>
        <Rating value={average} precision={0.1} readOnly />
        <Typography color="text.secondary">
          {average.toFixed(1)} from {reviews.length} review{reviews.length === 1 ? "" : "s"}
        </Typography>
      </Stack>
      <Stack component="ul" spacing={2} sx={{ listStyle: "none", p: 0, m: 0 }}>
        {reviews.map((r, i) => (
          <Fragment key={r.id}>
            {i > 0 && <Divider component="li" aria-hidden />}
            <li>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Rating value={r.stars} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">
                  {new Date(r.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </Typography>
              </Stack>
              <Typography
                sx={{ mt: 0.5, overflowWrap: "anywhere" }}
                color={r.comment ? "text.primary" : "text.secondary"}
              >
                {r.comment || "No comment"}
              </Typography>
            </li>
          </Fragment>
        ))}
      </Stack>
    </Paper>
  );
}
