"use client";

import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  EMPTY_REQUEST,
  type FieldErrors,
  fieldErrors,
  MAX_LENGTH,
  type RequestFields,
  SERVICE_TYPES,
  STEP_FIELDS,
} from "@/lib/orders/request";
import { type AutofillFields, mergeAutofill } from "@/lib/autofill/notice";
import { rememberRequest } from "@/lib/my-requests";
import { shrinkPhoto } from "./shrinkPhoto";

const STEPS = ["Photo", "Check details", "Contact info"] as const;

/** Errors for the fields on one step only, so later steps don't show errors too early. */
function stepErrors(step: number, fields: RequestFields): FieldErrors {
  const names = step === 1 ? STEP_FIELDS.details : step === 2 ? STEP_FIELDS.contact : [];
  const all = fieldErrors(fields);
  return Object.fromEntries(names.flatMap((name) => (all[name] ? [[name, all[name]]] : [])));
}

/** The customer's request, in three steps: photo, details, contact. */
export function RequestForm() {
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState(EMPTY_REQUEST);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  // Errors show only after the customer tries to continue, not while they're still typing.
  const [tried, setTried] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  // Reading the photo: the details it filled in are marked so the customer checks them.
  const [reading, setReading] = useState<"idle" | "reading" | "done" | "failed">("idle");
  const [readMessage, setReadMessage] = useState("");
  const [filledIn, setFilledIn] = useState<(keyof AutofillFields)[]>([]);
  const readId = useRef(0);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // On each new step, go back to the top and move focus to the step's heading, so screen
  // readers announce it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, [step]);

  // Free the photo preview's memory when it's replaced or the page closes.
  useEffect(() => () => void (photoUrl && URL.revokeObjectURL(photoUrl)), [photoUrl]);

  if (trackingUrl) return <Sent trackingUrl={trackingUrl} />;

  const errors = tried ? { ...stepErrors(step, fields), ...serverErrors } : {};

  const field = (name: keyof RequestFields) => ({
    name,
    value: fields[name],
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setFields((f) => ({ ...f, [name]: e.target.value }));
      setServerErrors(({ [name]: _, ...rest }) => rest);
      setFilledIn((names) => names.filter((n) => n !== name));
    },
    error: Boolean(errors[name]),
    helperText:
      errors[name] ??
      ((filledIn as string[]).includes(name) ? "From your photo. Check it's right." : undefined),
    fullWidth: true,
  });

  function choosePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUrl(URL.createObjectURL(file));
    void readPhoto(file);
  }

  /** Sends the photo to be read, and fills in the empty detail fields from it. */
  async function readPhoto(file: File) {
    const id = ++readId.current; // a newer photo replaces this one's answer
    setReading("reading");
    setReadMessage("");
    try {
      const body = new FormData();
      body.append("photo", await shrinkPhoto(file), "notice.jpg");
      const res = await fetch("/api/autofill", {
        method: "POST",
        body,
        signal: AbortSignal.timeout(35_000),
      });
      const data = (await res.json().catch(() => ({}))) as {
        fields?: AutofillFields;
        error?: string;
      };
      if (id !== readId.current) return;
      if (!res.ok || !data.fields) {
        throw new Error(data.error ?? "We couldn't read the notice. Type the details instead.");
      }
      const merged = mergeAutofill(fieldsRef.current, data.fields);
      setFields(merged.fields);
      setFilledIn(merged.filledIn);
      setReading("done");
      setReadMessage(
        merged.filledIn.length > 0
          ? "We filled in what we could read. Check it on the next step."
          : "You've already filled in the details, so we left them as they are.",
      );
    } catch (e) {
      if (id !== readId.current) return;
      setReading("failed");
      setReadMessage(
        e instanceof Error && !["TimeoutError", "AbortError", "TypeError"].includes(e.name)
          ? e.message
          : "We couldn't read the notice. Type the details instead.",
      );
    }
  }

  function next() {
    if (Object.keys(stepErrors(step, fields)).length > 0) {
      setTried(true);
      return;
    }
    setTried(false);
    setStep((s) => s + 1);
  }

  async function send() {
    if (Object.keys(stepErrors(step, fields)).length > 0) {
      setTried(true);
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = (await res.json().catch(() => ({}))) as {
        trackingToken?: string;
        trackingUrl?: string;
        error?: string;
        fields?: FieldErrors;
      };
      if (!res.ok || !data.trackingUrl) {
        // If the server found a problem on the details step, go back there to show it.
        const fieldNames = Object.keys(data.fields ?? {});
        if (fieldNames.some((name) => (STEP_FIELDS.details as readonly string[]).includes(name))) {
          setStep(1);
        }
        setServerErrors(data.fields ?? {});
        setTried(true);
        throw new Error(data.error ?? "Couldn't send your request. Please try again.");
      }
      if (data.trackingToken) {
        rememberRequest({
          token: data.trackingToken,
          serviceType: fields.serviceType,
          sentAt: new Date().toISOString(),
        });
      }
      setTrackingUrl(data.trackingUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your request. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Stack spacing={3}>
      {/* Laptops: all three steps. Phones: "Step 2 of 3" and a progress bar, which fit better. */}
      <Stepper activeStep={step} sx={{ display: { xs: "none", sm: "flex" } }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box sx={{ display: { sm: "none" } }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Step {step + 1} of {STEPS.length}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={((step + 1) / STEPS.length) * 100}
          aria-hidden
        />
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Typography
            variant="h2"
            component="h2"
            ref={headingRef}
            tabIndex={-1}
            sx={{ outline: "none" }}
          >
            {step === 0 && "Take a photo of the notice"}
            {step === 1 && "Check the details"}
            {step === 2 && "How can we reach you?"}
          </Typography>

          {step === 0 && (
            <>
              <Typography color="text.secondary">
                Optional. We&apos;ll read the notice and fill in the details for you to check. The
                photo is only used for this and isn&apos;t saved.
              </Typography>
              {photoUrl && (
                <Box
                  component="img"
                  src={photoUrl}
                  alt="Your notice"
                  sx={{
                    maxHeight: 280,
                    objectFit: "contain",
                    borderRadius: 1,
                    bgcolor: "grey.100",
                  }}
                />
              )}
              <Button
                component="label"
                variant="outlined"
                size="large"
                startIcon={<PhotoCameraIcon />}
              >
                {photoUrl ? "Choose another photo" : "Take or choose a photo"}
                {/* No `capture`, so phones offer both the camera and the photo library. */}
                <input type="file" accept="image/*" hidden onChange={choosePhoto} />
              </Button>
              {reading === "reading" && (
                <Box role="status">
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Reading your notice… You can go on and type the details meanwhile.
                  </Typography>
                  <LinearProgress />
                </Box>
              )}
              {reading === "done" && (
                <Alert severity="success" role="status">
                  {readMessage}
                </Alert>
              )}
              {reading === "failed" && (
                <Alert severity="info" role="status">
                  {readMessage}
                </Alert>
              )}
            </>
          )}

          {step === 1 && (
            <>
              {reading === "reading" && (
                <Typography variant="body2" color="text.secondary" role="status">
                  Still reading your photo. We&apos;ll fill in any empty fields when it&apos;s done.
                </Typography>
              )}
              {filledIn.length > 0 && (
                <Alert severity="info">
                  We filled in some details from your photo. Please check they&apos;re right.
                </Alert>
              )}
              <TextField
                {...field("serviceType")}
                select
                label="Service needed"
                slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
              >
                <option value="" disabled>
                  Choose a service
                </option>
                {SERVICE_TYPES.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </TextField>
              <TextField
                {...field("address")}
                label="Address where the work is needed"
                autoComplete="street-address"
                multiline
                slotProps={{ htmlInput: { maxLength: MAX_LENGTH.address } }}
              />
              <TextField
                {...field("dueDate")}
                type="date"
                label="Deadline on the notice (optional)"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                {...field("notes")}
                label="Anything the business should know? (optional)"
                multiline
                minRows={3}
                slotProps={{ htmlInput: { maxLength: MAX_LENGTH.notes } }}
              />
            </>
          )}

          {step === 2 && (
            <>
              <TextField
                {...field("name")}
                label="Your name"
                autoComplete="name"
                slotProps={{ htmlInput: { maxLength: MAX_LENGTH.name } }}
              />
              <TextField
                {...field("phone")}
                label="Phone"
                type="tel"
                autoComplete="tel"
                slotProps={{ htmlInput: { maxLength: MAX_LENGTH.phone } }}
              />
              <TextField
                {...field("email")}
                label="Email (optional)"
                type="email"
                autoComplete="email"
                slotProps={{ htmlInput: { maxLength: MAX_LENGTH.email } }}
              />
              <Typography variant="body2" color="text.secondary">
                Only the business that takes the job sees your contact details, and only to do the
                work. <Link href="/privacy">How we use your details</Link>
              </Typography>
            </>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1}>
            {step > 0 && (
              <Button
                variant="text"
                onClick={() => {
                  setTried(false);
                  setStep((s) => s - 1);
                }}
                disabled={sending}
              >
                Back
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            {step < STEPS.length - 1 ? (
              <Button variant="contained" size="large" onClick={next}>
                {step === 0 && !photoUrl ? "Skip, enter the details" : "Next"}
              </Button>
            ) : (
              <Button variant="contained" size="large" onClick={send} disabled={sending}>
                {sending ? "Sending…" : "Send request. We'll find a business for you."}
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

/** Shown after sending: the tracking link, which is the customer's only way back to the job. */
function Sent({ trackingUrl }: { trackingUrl: string }) {
  const fullUrl = `${window.location.origin}${trackingUrl}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [copyMessage, setCopyMessage] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopyMessage("Link copied.");
    } catch {
      // The clipboard needs https (or localhost), so it's missing when testing on a phone over
      // Wi-Fi. Select the link so the customer can copy it themselves.
      inputRef.current?.select();
      setCopyMessage("Press and hold the link to copy it.");
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h2" component="h2">
          Request sent
        </Typography>
        <Typography>We&apos;ll find a qualified business for you, usually within a day.</Typography>
        <Typography fontWeight={600}>Save this link to check progress:</Typography>
        <TextField
          value={fullUrl}
          inputRef={inputRef}
          fullWidth
          slotProps={{ htmlInput: { readOnly: true, "aria-label": "Your tracking link" } }}
          onFocus={(e) => e.target.select()}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="contained" size="large" onClick={copy}>
            Copy link
          </Button>
          <Button component={Link} href={trackingUrl} variant="outlined" size="large">
            Open tracking page
          </Button>
        </Stack>
        <Typography role="status" color="text.secondary">
          {copyMessage}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No account needed: the link is your key. Anyone with it can see this request, so share it
          only with people you trust.
        </Typography>
      </Stack>
    </Paper>
  );
}
