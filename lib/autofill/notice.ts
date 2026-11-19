// Reading a photo of a notice into the request form. No network or database access: this file
// checks the photo, says what to ask Claude, and cleans up the answer. The call itself is in
// read-notice.ts.

import { MAX_LENGTH, type RequestFields, SERVICE_TYPES } from "../orders/request";

/** Image types Claude can read. Phones send JPEG after the browser shrinks the photo. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];

/** Upper limit for an uploaded photo. The browser shrinks photos to well under this first. */
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

/** Longest edge, in pixels, the browser shrinks a photo to. Larger doesn't help Claude read it. */
export const MAX_PHOTO_EDGE = 1568;

/** The fields autofill may fill in. Never contact details: those are the customer's own. */
export type AutofillFields = Pick<RequestFields, "serviceType" | "address" | "dueDate" | "notes">;

/** What's wrong with an uploaded photo, in plain words, or null if it's fine. */
export function photoProblem(photo: { type: string; size: number }): string | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(photo.type)) {
    return "Send the photo as a JPEG, PNG, WebP or GIF.";
  }
  if (photo.size === 0) return "The photo is empty.";
  if (photo.size > MAX_PHOTO_BYTES) return "The photo is too large. Try a smaller one.";
  return null;
}

export const NOTICE_SYSTEM_PROMPT = `You read photos of notices that property owners receive, such as a city letter saying a fire safety inspection or a backflow test is due, and fill in a service request form from them.

Fill in only what the notice itself says. Leave a field as an empty string when the notice doesn't say it or you can't read it clearly; the customer checks every field before sending, and an empty field is better than a guess.

- serviceType: the one service the notice asks for, from the list. Use "Other" if it asks for a service that isn't listed, and "" if the photo isn't a notice or you can't tell.
- address: the address of the property where the work is needed, not the address of whoever sent the notice. One line, as written on the notice.
- dueDate: the deadline for the work, as YYYY-MM-DD. Only a date the notice states; don't work one out from wording like "within 30 days".
- notes: one or two short sentences for the business doing the work: what the notice asks for, and any reference or permit number. No names, phone numbers or email addresses.`;

/** The answer's shape, sent to Claude as a JSON schema so the reply always matches it. */
export const NOTICE_SCHEMA = {
  type: "object",
  properties: {
    serviceType: { type: "string", enum: [...SERVICE_TYPES, ""] },
    address: { type: "string" },
    dueDate: { type: "string" },
    notes: { type: "string" },
  },
  required: ["serviceType", "address", "dueDate", "notes"],
  additionalProperties: false,
} as const;

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  const oneSpaced = value.replace(/\s+/g, " ").trim();
  return oneSpaced.length > max ? oneSpaced.slice(0, max).trimEnd() : oneSpaced;
}

/**
 * Turns Claude's JSON answer into form fields. Anything missing, unreadable or not one of the
 * allowed values becomes an empty string, so the form never receives something it would reject.
 */
export function toAutofillFields(answer: unknown): AutofillFields {
  const raw = (typeof answer === "object" && answer !== null ? answer : {}) as Record<
    string,
    unknown
  >;
  const serviceType = text(raw.serviceType, MAX_LENGTH.serviceType);
  const dueDate = text(raw.dueDate, MAX_LENGTH.dueDate);
  const address = text(raw.address, MAX_LENGTH.address);
  return {
    serviceType: (SERVICE_TYPES as readonly string[]).includes(serviceType) ? serviceType : "",
    // Too short to be an address means it's noise; the form would reject it anyway.
    address: address.length >= 5 ? address : "",
    dueDate: isRealDate(dueDate) ? dueDate : "",
    notes: text(raw.notes, MAX_LENGTH.notes),
  };
}

/** True when the answer filled in nothing, so the form can say it couldn't read the notice. */
export function isEmptyAutofill(fields: AutofillFields) {
  return Object.values(fields).every((value) => value === "");
}

/**
 * Adds the autofilled values to the form, without overwriting anything the customer already
 * typed. Returns the new fields and which ones were filled in, so the form can point them out.
 */
export function mergeAutofill<T extends AutofillFields>(
  current: T,
  filled: AutofillFields,
): { fields: T; filledIn: (keyof AutofillFields)[] } {
  const fields = { ...current };
  const filledIn: (keyof AutofillFields)[] = [];
  for (const key of Object.keys(filled) as (keyof AutofillFields)[]) {
    if (filled[key] && !current[key].trim()) {
      fields[key] = filled[key];
      filledIn.push(key);
    }
  }
  return { fields, filledIn };
}
