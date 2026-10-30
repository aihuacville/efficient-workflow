"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Action } from "@/lib/orders/status";

type Business = { id: string; name: string; services: string[] };

/** Actions that undo work or can't be taken back: ask before doing them. */
const CONFIRM: Partial<Record<Action, { title: string; body: string; danger?: boolean }>> = {
  cancel: {
    title: "Cancel this job?",
    body: "The customer will see that it was cancelled. This can't be undone.",
    danger: true,
  },
  withdraw: {
    title: "Withdraw the offer?",
    body: "The business can no longer accept it, and the job goes back to New requests.",
  },
};

/**
 * The buttons for one job, as allowed by the workflow rules (the page passes in nextActions).
 * Each button calls POST /api/orders/<id>/actions, then reloads the page's data.
 */
export function OrderActions({
  orderId,
  serviceType,
  actions,
  businesses = [],
}: {
  orderId: string;
  serviceType: string;
  actions: { action: Action; label: string }[];
  businesses?: Business[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Businesses that offer this service first, so the likely choice is at the top.
  const sorted = [...businesses].sort(
    (a, b) => Number(b.services.includes(serviceType)) - Number(a.services.includes(serviceType)),
  );
  const [businessId, setBusinessId] = useState(sorted[0]?.id ?? "");

  async function run(action: Action, details: Record<string, string> = {}) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...details }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setOpen(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setOpen(null);
      // The job may have changed under us (for example, someone else acted first): show the latest.
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const chosen = businesses.find((b) => b.id === businessId);
  const confirm = open ? CONFIRM[open] : undefined;

  return (
    <>
      {actions.map(({ action, label }, i) => (
        <Button
          key={action}
          size="small"
          variant={i === 0 && !CONFIRM[action]?.danger ? "contained" : "outlined"}
          color={CONFIRM[action]?.danger ? "error" : "primary"}
          disabled={busy}
          onClick={() => (action === "offer" || CONFIRM[action] ? setOpen(action) : run(action))}
          sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
        >
          {label}
        </Button>
      ))}

      <Dialog open={open === "offer"} onClose={() => setOpen(null)} fullWidth maxWidth="xs">
        <DialogTitle>Offer this job</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}>{serviceType}. Choose a business:</DialogContentText>
          <RadioGroup value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
            {sorted.map((b) => {
              const offers = b.services.includes(serviceType);
              return (
                <FormControlLabel
                  key={b.id}
                  value={b.id}
                  control={<Radio />}
                  label={
                    <>
                      <Typography>{b.name}</Typography>
                      <Typography
                        variant="body2"
                        color={offers ? "success.main" : "text.secondary"}
                      >
                        {offers
                          ? `Offers ${serviceType.toLowerCase()}`
                          : "Doesn't list this service"}
                      </Typography>
                    </>
                  }
                  sx={{ py: 0.5 }}
                />
              );
            })}
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(null)}>Back</Button>
          <Button
            variant="contained"
            disabled={!chosen || busy}
            onClick={() => run("offer", { businessId })}
          >
            {chosen ? `Offer to ${chosen.name}` : "Offer"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirm)} onClose={() => setOpen(null)} maxWidth="xs">
        <DialogTitle>{confirm?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirm?.body}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(null)}>Keep it</Button>
          <Button
            variant="contained"
            color={confirm?.danger ? "error" : "primary"}
            disabled={busy}
            onClick={() => open && run(open)}
          >
            {actions.find((a) => a.action === open)?.label}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(error)} autoHideDuration={8000} onClose={() => setError("")}>
        <Alert severity="error" onClose={() => setError("")} variant="filled">
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
