"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Shown on the tracking page once the work is done: the customer confirms it, or reports a
 * problem. Confirming makes the rating appear; a problem goes to the business for a return visit.
 */
export function CustomerConfirm({
  trackingToken,
  businessName,
}: {
  trackingToken: string;
  businessName: string;
}) {
  const router = useRouter();
  const [reporting, setReporting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(action: "confirm" | "reportProblem") {
    if (action === "reportProblem" && !note.trim()) {
      setError("Tell us what went wrong.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/track/${trackingToken}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "confirm" ? { action } : { action, note: note.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't send that. Please try again.");
      // The page reads the job on the server, so render it again to show the new status.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send that. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h2" component="h2">
          Is the work done?
        </Typography>
        <Typography color="text.secondary">
          {businessName} marked the job as done. Check the work, then let us know.
        </Typography>

        {reporting && (
          <TextField
            label="What went wrong?"
            placeholder="For example: the back gate inspection was missed"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setError("");
            }}
            multiline
            minRows={3}
            autoFocus
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
        )}
        {error && <Alert severity="error">{error}</Alert>}

        {reporting ? (
          <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1}>
            <Button onClick={() => setReporting(false)} disabled={busy}>
              Back
            </Button>
            <Button
              variant="contained"
              color="warning"
              size="large"
              onClick={() => send("reportProblem")}
              disabled={busy}
            >
              {busy ? "Sending…" : "Send to the business"}
            </Button>
          </Stack>
        ) : (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="contained"
              size="large"
              onClick={() => send("confirm")}
              disabled={busy}
            >
              {busy ? "Sending…" : "Yes, the work is done"}
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => setReporting(true)}
              disabled={busy}
            >
              Report a problem
            </Button>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
