"use client";

import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import { readMyRequests, type RememberedRequest } from "@/lib/my-requests";

/** "Your requests" on the home page: links back to requests sent or opened on this device. */
export function MyRequests() {
  // Read after the page loads: the server can't see this browser's storage.
  const [requests, setRequests] = useState<RememberedRequest[]>([]);
  useEffect(() => setRequests(readMyRequests()), []);
  if (requests.length === 0) return null;

  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="h2" component="h2" gutterBottom>
        Your requests
      </Typography>
      <Stack component="ul" spacing={1} sx={{ listStyle: "none", p: 0, m: 0 }}>
        {requests.map((r) => (
          <li key={r.token}>
            <Link component={NextLink} href={`/track/${r.token}`} underline="always">
              {r.serviceType}
            </Link>
            <Typography component="span" color="text.secondary">
              {" "}
              · sent{" "}
              {new Date(r.sentAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </Typography>
          </li>
        ))}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        Saved on this device only.
      </Typography>
    </Paper>
  );
}
