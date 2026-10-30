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
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Action } from "@/lib/orders/status";

type Business = { id: string; name: string; services: string[] };
type Person = { id: string; name: string; role: string };

/** Actions that need details first, so they open a dialog instead of acting straight away. */
const NEEDS_DIALOG = new Set<Action>(["offer", "schedule", "rebook", "decline"]);

/** Tomorrow at 9:00 in the viewer's time zone, as a datetime-local input expects. */
function tomorrowAtNine() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

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
  markDone: {
    title: "Mark this job done?",
    body: "Use this if the technician forgot to update the job. The customer will be asked to confirm the work.",
  },
};

/** Secondary choices, shown as outlined buttons even when they come first. */
const SECONDARY = new Set<Action>(["markDone", "decline"]);

/**
 * The buttons for one job, as allowed by the workflow rules (the page passes in nextActions).
 * Each button calls POST /api/orders/<id>/actions, then reloads the page's data.
 */
export function OrderActions({
  orderId,
  serviceType,
  actions,
  businesses = [],
  people = [],
  size = "small",
}: {
  orderId: string;
  serviceType: string;
  actions: { action: Action; label: string }[];
  /** offer: the businesses to choose from. */
  businesses?: Business[];
  /** schedule, rebook: who can do the visit (the business's technicians and owners). */
  people?: Person[];
  /** large: full-width buttons, easy to tap on a phone (the technician's page). */
  size?: "small" | "large";
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
  // Technicians first: the owner can send themselves, but usually sends a technician.
  const visitors = [...people].sort(
    (a, b) => Number(b.role === "TECHNICIAN") - Number(a.role === "TECHNICIAN"),
  );
  const [technicianId, setTechnicianId] = useState(visitors[0]?.id ?? "");
  const [visitStart, setVisitStart] = useState(tomorrowAtNine);
  const [note, setNote] = useState("");

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
          size={size}
          fullWidth={size === "large"}
          variant={
            i === 0 && !CONFIRM[action]?.danger && !SECONDARY.has(action) ? "contained" : "outlined"
          }
          color={CONFIRM[action]?.danger ? "error" : "primary"}
          disabled={busy}
          onClick={() =>
            NEEDS_DIALOG.has(action) || CONFIRM[action] ? setOpen(action) : run(action)
          }
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

      <Dialog
        open={open === "schedule" || open === "rebook"}
        onClose={() => setOpen(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {open === "rebook" ? "Book a return visit" : "Schedule the visit"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}>Who&apos;s going?</DialogContentText>
          <RadioGroup value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
            {visitors.map((p) => (
              <FormControlLabel
                key={p.id}
                value={p.id}
                control={<Radio />}
                label={p.role === "OWNER" ? `${p.name} (owner)` : p.name}
              />
            ))}
          </RadioGroup>
          <TextField
            type="datetime-local"
            label="Visit starts"
            value={visitStart}
            onChange={(e) => setVisitStart(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(null)}>Back</Button>
          <Button
            variant="contained"
            disabled={!technicianId || !visitStart || busy}
            // The input gives local time ("2026-10-31T09:00"); send it as an exact moment.
            onClick={() =>
              open && run(open, { technicianId, visitStart: new Date(visitStart).toISOString() })
            }
          >
            {open === "rebook" ? "Book visit" : "Schedule"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open === "decline"} onClose={() => setOpen(null)} fullWidth maxWidth="xs">
        <DialogTitle>Decline this job?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            It goes back to the dispatcher, who will offer it to another business.
          </DialogContentText>
          <TextField
            label="Reason (optional)"
            placeholder="For example: fully booked this week"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(null)}>Back</Button>
          <Button variant="contained" disabled={busy} onClick={() => run("decline", { note })}>
            Decline
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
