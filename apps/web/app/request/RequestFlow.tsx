"use client";

import {
  EXTRACTED_FIELDS,
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
  type NoticeExtraction,
} from "@ew/extraction";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import { downscaleImage } from "@/lib/downscale";
import { OrderRequestSchema, type OrderRequest } from "@/lib/order-schema";

type Step =
  | { kind: "upload"; error?: string }
  | { kind: "extracting"; previewUrl: string }
  | { kind: "review"; previewUrl?: string; extraction: NoticeExtraction | null; warning?: string };

type LowConfidenceField = (typeof EXTRACTED_FIELDS)[number];

const EMPTY_FORM: OrderRequest = {
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notifyPref: "EMAIL",
  address: { line1: "", line2: "", city: "", state: "", postalCode: "" },
  serviceType: "other",
  issuingAuthority: "",
  noticeId: "",
  dueDate: "",
  notes: "",
  extraction: null,
};

function formFromExtraction(x: NoticeExtraction): OrderRequest {
  return {
    ...EMPTY_FORM,
    contactName: x.recipientName ?? "",
    address: {
      line1: x.address?.line1 ?? "",
      line2: x.address?.line2 ?? "",
      city: x.address?.city ?? "",
      state: x.address?.state ?? "",
      postalCode: x.address?.postalCode ?? "",
    },
    serviceType: x.serviceType,
    issuingAuthority: x.issuingAuthority ?? "",
    noticeId: x.noticeId ?? "",
    dueDate: x.dueDate ?? "",
    notes: x.summary,
    extraction: x,
  };
}

export function RequestFlow() {
  const [step, setStep] = useState<Step>({ kind: "upload" });

  async function onPhoto(file: File) {
    const previewUrl = URL.createObjectURL(file);
    setStep({ kind: "extracting", previewUrl });
    try {
      const body = new FormData();
      body.append("image", await downscaleImage(file), "notice.jpg");
      const res = await fetch("/api/v1/extract", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");
      const extraction = data.extraction as NoticeExtraction;
      setStep({
        kind: "review",
        previewUrl,
        extraction,
        warning: extraction.isNotice
          ? undefined
          : "This doesn't look like a notice. Fill in the details yourself, or try another photo.",
      });
    } catch (e) {
      setStep({
        kind: "review",
        previewUrl,
        extraction: null,
        warning: `We couldn't read the photo (${(e as Error).message}). Please fill in the details below.`,
      });
    }
  }

  if (step.kind === "upload") {
    return (
      <Stack spacing={3}>
        <Typography color="text.secondary">
          Take a clear photo of the whole notice. We&apos;ll read it and fill in the form for you.
        </Typography>
        {step.error && <Alert severity="error">{step.error}</Alert>}
        <Button variant="contained" size="large" component="label">
          Take or upload a photo
          <input
            hidden
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onPhoto(file);
            }}
          />
        </Button>
        <Button onClick={() => setStep({ kind: "review", extraction: null })}>
          Skip and fill in by hand
        </Button>
      </Stack>
    );
  }

  if (step.kind === "extracting") {
    return (
      <Stack spacing={3} alignItems="center">
        <NoticePreview url={step.previewUrl} />
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={24} />
          <Typography>Reading your notice…</Typography>
        </Stack>
      </Stack>
    );
  }

  return <ReviewForm {...step} onRetake={() => setStep({ kind: "upload" })} />;
}

function NoticePreview({ url }: { url: string }) {
  return (
    <Box
      component="img"
      src={url}
      alt="Your notice"
      sx={{ width: "100%", maxHeight: 280, objectFit: "contain", borderRadius: 1, bgcolor: "action.hover" }}
    />
  );
}

function ReviewForm({
  previewUrl,
  extraction,
  warning,
  onRetake,
}: Extract<Step, { kind: "review" }> & { onRetake: () => void }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string>();
  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<OrderRequest>({
    resolver: zodResolver(OrderRequestSchema),
    defaultValues: extraction ? formFromExtraction(extraction) : EMPTY_FORM,
  });
  const lowConfidence = new Set<LowConfidenceField>(extraction?.lowConfidenceFields ?? []);
  const notifyPref = watch("notifyPref");

  async function onSubmit(values: OrderRequest) {
    setSubmitError(undefined);
    const res = await fetch("/api/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) {
      setSubmitError(data.error ?? "Something went wrong. Please try again.");
      return;
    }
    router.push(`/track/${data.id}`);
  }

  const field = (
    name: FieldPath<OrderRequest>,
    label: string,
    opts: { flag?: LowConfidenceField; type?: string; multiline?: boolean; required?: boolean } = {},
  ) => (
    <Controller
      name={name}
      control={control}
      render={({ field: f, fieldState }) => {
        const flagged = opts.flag && lowConfidence.has(opts.flag);
        return (
          <TextField
            {...f}
            value={f.value ?? ""}
            label={label}
            type={opts.type}
            required={opts.required}
            multiline={opts.multiline}
            minRows={opts.multiline ? 2 : undefined}
            color={flagged ? "warning" : undefined}
            focused={flagged || undefined}
            error={!!fieldState.error}
            helperText={fieldState.error?.message ?? (flagged ? "Please double-check this" : undefined)}
            slotProps={opts.type === "date" ? { inputLabel: { shrink: true } } : undefined}
          />
        );
      }}
    />
  );

  return (
    <Stack component="form" spacing={3} onSubmit={handleSubmit(onSubmit)} noValidate>
      {previewUrl && <NoticePreview url={previewUrl} />}
      {warning && <Alert severity="warning">{warning}</Alert>}
      {extraction?.isNotice && (
        <Alert severity="info">
          We filled this in from your photo. Check everything, then confirm.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography fontWeight={600}>Service</Typography>
          <Controller
            name="serviceType"
            control={control}
            render={({ field: f }) => (
              <TextField
                {...f}
                select
                label="Service needed"
                color={lowConfidence.has("serviceType") ? "warning" : undefined}
                focused={lowConfidence.has("serviceType") || undefined}
              >
                {SERVICE_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {SERVICE_TYPE_LABELS[t]}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          {field("dueDate", "Due date", { type: "date", flag: "dueDate" })}
          {field("issuingAuthority", "Issued by", { flag: "issuingAuthority" })}
          {field("noticeId", "Notice / case number", { flag: "noticeId" })}
          {field("notes", "Notes for the business", { multiline: true })}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography fontWeight={600}>Service address</Typography>
          {field("address.line1", "Street address", { flag: "address", required: true })}
          {field("address.line2", "Apt, suite, unit")}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            {field("address.city", "City", { flag: "address", required: true })}
            {field("address.state", "State", { flag: "address", required: true })}
            {field("address.postalCode", "ZIP", { flag: "address", required: true })}
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography fontWeight={600}>Your contact details</Typography>
          {field("contactName", "Name or business", { flag: "recipientName", required: true })}
          <Controller
            name="notifyPref"
            control={control}
            render={({ field: f }) => (
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={f.value}
                onChange={(_, v) => v && f.onChange(v)}
                aria-label="How should we update you?"
              >
                <ToggleButton value="EMAIL">Email me</ToggleButton>
                <ToggleButton value="SMS">Text me</ToggleButton>
              </ToggleButtonGroup>
            )}
          />
          {field("contactEmail", "Email", { type: "email", required: notifyPref === "EMAIL" })}
          {field("contactPhone", "Mobile phone", { type: "tel", required: notifyPref === "SMS" })}
        </Stack>
      </Paper>

      {submitError && <Alert severity="error">{submitError}</Alert>}
      <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={2} justifyContent="flex-end">
        <Button onClick={onRetake} disabled={isSubmitting}>
          Use a different photo
        </Button>
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Confirm request"}
        </Button>
      </Stack>
    </Stack>
  );
}
