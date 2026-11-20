"use client";

import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MuiLink from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { type AutofillFields, mergeAutofill } from "@/lib/autofill/notice";
import { formatDate } from "@/lib/format";
import { forgetContact, readContact, rememberContact } from "@/lib/my-contact";
import { rememberRequest } from "@/lib/my-requests";
import {
  BACKFLOW,
  CONTACT_PREFERENCES,
  EMPTY_REQUEST,
  type FieldErrors,
  fieldErrors,
  MAX_LENGTH,
  needsDueDate,
  normalizeTracNumber,
  type RequestFields,
  SERVICE_TYPES,
  STEP_FIELDS,
} from "@/lib/orders/request";
import { shrinkPhoto } from "./shrinkPhoto";

const STEPS = ["Photo", "Check details", "Contact and send"] as const;

/** Errors for the fields on one step only, so later steps don't show errors too early. */
function stepErrors(step: number, fields: RequestFields): FieldErrors {
  const names = step === 1 ? STEP_FIELDS.details : step === 2 ? STEP_FIELDS.contact : [];
  const all = fieldErrors(fields);
  return Object.fromEntries(names.flatMap((name) => (all[name] ? [[name, all[name]]] : [])));
}

/**
 * The customer's request, in three steps: a photo of the notice (read by Claude to fill in the
 * details), checking the details next to the photo, then contact info and sending. Checking and
 * sending are separate steps on purpose, so details read from the photo are looked at before
 * anything is sent.
 */
export function RequestForm() {
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState(EMPTY_REQUEST);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
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
  // Name and phone remembered from this customer's last request on this phone.
  const [contactPrefilled, setContactPrefilled] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const readId = useRef(0);
  const stepRef = useRef(step);
  stepRef.current = step;
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

  // Fill in the name and phone from last time. In an effect, because browser storage doesn't
  // exist while the page is rendered on the server.
  useEffect(() => {
    const saved = readContact();
    if (!saved) return;
    setFields((f) => ({ ...f, name: f.name || saved.name, phone: f.phone || saved.phone }));
    setContactPrefilled(true);
  }, []);

  if (trackingUrl) return <Sent trackingUrl={trackingUrl} />;

  const errors = tried ? { ...stepErrors(step, fields), ...serverErrors } : {};
  const isBackflow = fields.serviceType === BACKFLOW;

  /** A hint under a field: its error, else whether it came from the photo or couldn't be read. */
  function hint(name: keyof RequestFields): string | undefined {
    if (errors[name]) return errors[name];
    if ((filledIn as string[]).includes(name)) return "From your photo. Check it's right.";
    const required =
      name === "serviceType" ||
      name === "address" ||
      (name === "dueDate" && needsDueDate(fields.serviceType)) ||
      (name === "tracNumber" && fields.serviceType === BACKFLOW);
    if (reading === "done" && required && !fields[name]) {
      return "We couldn't read this from your photo. Please fill it in.";
    }
    return undefined;
  }

  const field = (name: keyof RequestFields) => ({
    name,
    value: fields[name],
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setFields((f) => ({ ...f, [name]: e.target.value }));
      setServerErrors(({ [name]: _, ...rest }) => rest);
      setFilledIn((names) => names.filter((n) => n !== name));
    },
    error: Boolean(errors[name]),
    helperText: hint(name),
    fullWidth: true,
  });

  function choosePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUrl(URL.createObjectURL(file));
    void readPhoto(file);
  }

  /** Sends the photo to be read, fills in the empty detail fields, then shows them to check. */
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
        throw new Error(data.error ?? "We couldn't read the notice. Please type the details.");
      }
      const merged = mergeAutofill(fieldsRef.current, data.fields);
      setFields(merged.fields);
      setFilledIn(merged.filledIn);
      setReading("done");
      setReadMessage(
        merged.filledIn.length > 0
          ? "We filled in the details marked “From your photo”. Check them against your notice."
          : "You'd already filled in the details, so we left them as they are.",
      );
    } catch (e) {
      if (id !== readId.current) return;
      setReading("failed");
      setReadMessage(
        e instanceof Error && !["TimeoutError", "AbortError", "TypeError"].includes(e.name)
          ? e.message
          : "We couldn't read the notice. Please type the details.",
      );
    }
    // Show the details to check, unless the customer has already moved on or gone back further.
    if (stepRef.current === 0) {
      setTried(false);
      setStep(1);
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

  function back(to: number) {
    setTried(false);
    setError("");
    setStep(to);
  }

  function clearContact() {
    forgetContact();
    setFields((f) => ({ ...f, name: "", phone: "" }));
    setContactPrefilled(false);
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
      if (rememberMe) rememberContact({ name: fields.name, phone: fields.phone });
      else forgetContact();
      setTrackingUrl(data.trackingUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your request. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const photo = photoUrl && (
    <ButtonBase
      onClick={() => setPhotoOpen(true)}
      aria-label="Your notice. Tap to see it full size"
      sx={{ display: "block", borderRadius: 1, overflow: "hidden", bgcolor: "grey.100" }}
    >
      <Box
        component="img"
        src={photoUrl}
        alt=""
        sx={{
          display: "block",
          width: "100%",
          maxHeight: { xs: 160, md: 520 },
          objectFit: "contain",
        }}
      />
    </ButtonBase>
  );

  const detailFields = (
    <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
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
        label={needsDueDate(fields.serviceType) ? "Due date" : "Due date (optional)"}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      {isBackflow && (
        <TextField
          {...field("tracNumber")}
          label="TRAC number"
          helperText={
            hint("tracNumber") ?? "On your backflow test notice, for example TRAC# 17408."
          }
          slotProps={{
            htmlInput: { maxLength: MAX_LENGTH.tracNumber, inputMode: "numeric" },
          }}
        />
      )}
      <TextField
        {...field("notes")}
        label="Anything the business should know? (optional)"
        multiline
        minRows={3}
        slotProps={{ htmlInput: { maxLength: MAX_LENGTH.notes } }}
      />
    </Stack>
  );

  const summary: [string, string][] = [
    ["Service", fields.serviceType],
    ["Address", fields.address.trim()],
    [
      "Due date",
      fields.dueDate ? formatDate(new Date(`${fields.dueDate}T12:00:00Z`)) : "None given",
    ],
    ...(isBackflow && fields.tracNumber.trim()
      ? [["TRAC number", normalizeTracNumber(fields.tracNumber)] as [string, string]]
      : []),
  ];

  return (
    // Wider on the details step, so the photo fits next to the fields on a laptop.
    <Stack spacing={3} sx={{ maxWidth: step === 1 && photoUrl ? "none" : 600 }}>
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
                    Reading your notice… This takes a few seconds.
                  </Typography>
                  <LinearProgress />
                </Box>
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
              {reading === "done" && (
                <Alert severity="info" role="status">
                  {readMessage}
                </Alert>
              )}
              {reading === "failed" && (
                <Alert severity="warning" role="status">
                  {readMessage}
                </Alert>
              )}
              {photo ? (
                <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="flex-start">
                  <Box
                    sx={{
                      width: { xs: "100%", md: "40%" },
                      flexShrink: 0,
                      position: { md: "sticky" },
                      top: { md: 16 },
                    }}
                  >
                    {photo}
                    <Typography variant="caption" color="text.secondary">
                      Tap the photo to see it full size.
                    </Typography>
                  </Box>
                  {detailFields}
                </Stack>
              ) : (
                detailFields
              )}
            </>
          )}

          {step === 2 && (
            <>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={600}>Your request</Typography>
                  <Button size="small" onClick={() => back(1)} disabled={sending}>
                    Edit
                  </Button>
                </Stack>
                <Box
                  component="dl"
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    columnGap: 2,
                    rowGap: 0.5,
                    m: 0,
                  }}
                >
                  {summary.map(([label, value]) => (
                    <Box key={label} sx={{ display: "contents" }}>
                      <Typography component="dt" variant="body2" color="text.secondary">
                        {label}
                      </Typography>
                      <Typography
                        component="dd"
                        variant="body2"
                        sx={{ m: 0, overflowWrap: "anywhere" }}
                      >
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>

              {contactPrefilled && (
                <Typography variant="body2" color="text.secondary">
                  We filled in your name and phone from last time.{" "}
                  <MuiLink component="button" type="button" onClick={clearContact}>
                    Not you? Clear
                  </MuiLink>
                </Typography>
              )}
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
              <FormControl error={Boolean(errors.contactPreference)}>
                <FormLabel id="contact-preference-label">
                  How would you like the business to reach you?
                </FormLabel>
                <RadioGroup
                  row
                  name="contactPreference"
                  aria-labelledby="contact-preference-label"
                  value={fields.contactPreference}
                  onChange={field("contactPreference").onChange}
                >
                  {CONTACT_PREFERENCES.map((option) => (
                    <FormControlLabel
                      key={option}
                      value={option}
                      control={<Radio />}
                      label={option}
                    />
                  ))}
                </RadioGroup>
                {errors.contactPreference && (
                  <FormHelperText>{errors.contactPreference}</FormHelperText>
                )}
              </FormControl>
              <TextField
                {...field("email")}
                label={fields.contactPreference === "Email" ? "Email" : "Email (optional)"}
                type="email"
                autoComplete="email"
                slotProps={{ htmlInput: { maxLength: MAX_LENGTH.email } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                }
                label="Remember my name and phone on this phone"
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
              <Button variant="text" onClick={() => back(step - 1)} disabled={sending}>
                Back
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            {step === 0 && (
              <Button variant="contained" size="large" onClick={next}>
                {!photoUrl
                  ? "Skip, enter the details"
                  : reading === "reading"
                    ? "Type the details instead"
                    : "Next"}
              </Button>
            )}
            {step === 1 && (
              <Button variant="contained" size="large" onClick={next}>
                Details look right
              </Button>
            )}
            {step === 2 && (
              <Button variant="contained" size="large" onClick={send} disabled={sending}>
                {sending ? "Sending…" : "Send request. We'll find a business for you."}
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Dialog open={photoOpen} onClose={() => setPhotoOpen(false)} maxWidth="lg" fullWidth>
        <DialogContent sx={{ p: 1 }}>
          {photoUrl && (
            <Box
              component="img"
              src={photoUrl}
              alt="Your notice, full size"
              sx={{ display: "block", width: "100%", height: "auto" }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhotoOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
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
