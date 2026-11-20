// Reading a photo of a notice into the request form. No network or database access: this file
// checks the photo, says what to ask Claude, and cleans up the answer. The call itself is in
// read-notice.ts.

import {
  BACKFLOW,
  MAX_LENGTH,
  normalizeTracNumber,
  type RequestFields,
  SERVICE_TYPES,
} from "../orders/request";

/** Image types Claude can read. Phones send JPEG after the browser shrinks the photo. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];

/** Upper limit for an uploaded photo. The browser shrinks photos to well under this first. */
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

/** Longest edge, in pixels, the browser shrinks a photo to. Larger doesn't help Claude read it. */
export const MAX_PHOTO_EDGE = 1568;

/** The fields autofill may fill in. Never contact details: those are the customer's own. */
export type AutofillFields = Pick<
  RequestFields,
  "serviceType" | "address" | "dueDate" | "tracNumber" | "notes"
>;

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
- dueDate: the date the work or test is due. Notices label it in different ways, for example "Due date", "Due by", "Test due", "Must be completed by", "Compliance date" or "Deadline". Never the date the notice was written or sent. Write it as YYYY-MM-DD: a date printed as 12/15/2026 or December 15, 2026 is 2026-12-15 (dates on these notices are month first). If the due date is printed without a year, such as "July 1", write just the month and day as printed ("July 1"); don't add a year. Only a date the notice states; don't work one out from wording like "within 30 days". If the notice gives only a month and year, leave dueDate empty and say "Due <month> <year>" in notes.
- noticeDate: the date the notice was written or sent, often labelled "Notice date", "Date" or "Mailed", as YYYY-MM-DD. "" if the notice doesn't show one.
- tracNumber: for backflow testing notices only, the TRAC number (Tester Remote Access Code), usually printed as "TRAC#" followed by digits, for example "TRAC# 17408". Give just the digits. Only a number the notice labels as the TRAC number; never an account, permit, meter or serial number. "" if there isn't one.
- notes: one or two short sentences for the business doing the work: what the notice asks for, and any reference or permit number other than the TRAC number. No names, phone numbers or email addresses.`;

/** The answer's shape, sent to Claude as a JSON schema so the reply always matches it. */
export const NOTICE_SCHEMA = {
  type: "object",
  properties: {
    serviceType: { type: "string", enum: [...SERVICE_TYPES, ""] },
    address: { type: "string" },
    dueDate: { type: "string" },
    noticeDate: { type: "string" },
    tracNumber: { type: "string" },
    notes: { type: "string" },
  },
  required: ["serviceType", "address", "dueDate", "noticeDate", "tracNumber", "notes"],
  additionalProperties: false,
} as const;

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * A due date as YYYY-MM-DD, from the formats notices use: 2026-12-15, 12/15/2026, 12-15-26,
 * December 15, 2026, Dec. 15 2026 or 15 December 2026. Numeric dates are read month first, as
 * on US notices. Returns "" for anything else, including a month and year with no day.
 */
export function toIsoDate(value: string): string {
  const v = value.trim().replace(/(\d)(st|nd|rd|th)\b/gi, "$1");
  let year: number, month: number, day: number;
  let m: RegExpMatchArray | null;
  if ((m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
    [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if ((m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/))) {
    [month, day, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (year < 100) year += 2000;
  } else if ((m = v.match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/i))) {
    [month, day, year] = [MONTHS.indexOf(m[1]!.toLowerCase()) + 1, Number(m[2]), Number(m[3])];
  } else if ((m = v.match(/^(\d{1,2})\s+([a-z]{3})[a-z]*\.?,?\s+(\d{4})$/i))) {
    [day, month, year] = [Number(m[1]), MONTHS.indexOf(m[2]!.toLowerCase()) + 1, Number(m[3])];
  } else {
    return "";
  }
  return isoFrom(year, month, day);
}

function isoFrom(year: number, month: number, day: number) {
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return month >= 1 && isRealDate(iso) ? iso : "";
}

/**
 * A due date printed without a year ("July 1", "Jul. 1", "1 July", "7/1"), given the year from
 * the notice's own date: the first such day on or after the notice date. Notice dated April 30,
 * 2026, due July 1: 2026-07-01. Notice dated November 3, 2026, due January 15: 2027-01-15.
 * Returns "" when either date can't be read.
 */
export function dueDateWithoutYear(value: string, noticeDate: string): string {
  const notice = toIsoDate(noticeDate);
  if (!notice) return "";
  const v = value.trim().replace(/(\d)(st|nd|rd|th)\b/gi, "$1");
  let month: number, day: number;
  let m: RegExpMatchArray | null;
  if ((m = v.match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2})$/i))) {
    [month, day] = [MONTHS.indexOf(m[1]!.toLowerCase()) + 1, Number(m[2])];
  } else if ((m = v.match(/^(\d{1,2})\s+([a-z]{3})[a-z]*\.?$/i))) {
    [day, month] = [Number(m[1]), MONTHS.indexOf(m[2]!.toLowerCase()) + 1];
  } else if ((m = v.match(/^(\d{1,2})\/(\d{1,2})$/))) {
    [month, day] = [Number(m[1]), Number(m[2])];
  } else {
    return "";
  }
  const year = Number(notice.slice(0, 4));
  const sameYear = isoFrom(year, month, day);
  if (sameYear && sameYear >= notice) return sameYear;
  return isoFrom(year + 1, month, day);
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
  // Read the date before shortening anything: "December 15, 2026" is longer than the field.
  // Some notices print the due date without a year; the notice's own date supplies it.
  const dueText = text(raw.dueDate, 40);
  const dueDate = toIsoDate(dueText) || dueDateWithoutYear(dueText, text(raw.noticeDate, 40));
  const address = text(raw.address, MAX_LENGTH.address);
  const trac = normalizeTracNumber(text(raw.tracNumber, MAX_LENGTH.tracNumber));
  return {
    serviceType: (SERVICE_TYPES as readonly string[]).includes(serviceType) ? serviceType : "",
    // Too short to be an address means it's noise; the form would reject it anyway.
    address: address.length >= 5 ? address : "",
    dueDate,
    // Only backflow notices have one, and only digits count; anything else is likely a misread.
    tracNumber: serviceType === BACKFLOW && /^\d{1,20}$/.test(trac) ? trac : "",
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
