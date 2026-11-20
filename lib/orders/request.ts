// Checks a customer's service request. No database access: the form uses it to show errors as
// the customer goes, and the server uses it again, because anyone can call the API directly.

export const SERVICE_TYPES = [
  "Fire safety inspection",
  "Backflow testing",
  "Lawn care",
  "Other",
] as const;

/** The one service whose notices carry a TRAC number. */
export const BACKFLOW = "Backflow testing";

/** Services that come with a notice giving a due date, so the due date is required for them. */
export const DUE_DATE_REQUIRED: readonly string[] = ["Fire safety inspection", BACKFLOW];

export function needsDueDate(serviceType: string) {
  return DUE_DATE_REQUIRED.includes(serviceType.trim());
}

/** How the customer would like the business to reach them, as the form shows it. */
export const CONTACT_PREFERENCES = ["Call", "Text", "Email"] as const;
export type ContactPreferenceLabel = (typeof CONTACT_PREFERENCES)[number];

/** As saved in the database. */
export const CONTACT_PREFERENCE_VALUES = {
  Call: "CALL",
  Text: "TEXT",
  Email: "EMAIL",
} as const satisfies Record<ContactPreferenceLabel, string>;

/** "Prefers a text" for staff pages, or null for customers from before it was asked. */
export function preferenceNote(saved: string | null | undefined): string | null {
  if (saved === "CALL") return "Prefers a call";
  if (saved === "TEXT") return "Prefers a text";
  if (saved === "EMAIL") return "Prefers email";
  return null;
}

/** The form's fields, as typed. Optional ones are empty strings when left blank. */
export type RequestFields = {
  serviceType: string;
  address: string;
  dueDate: string;
  notes: string;
  /** Backflow testing only: the utility's Tester Remote Access Code, digits like 17408. */
  tracNumber: string;
  name: string;
  phone: string;
  email: string;
  /** One of CONTACT_PREFERENCES. */
  contactPreference: string;
};

export type FieldErrors = Partial<Record<keyof RequestFields, string>>;

/** Which fields each form step asks for, so the form can check one step at a time. */
export const STEP_FIELDS = {
  details: ["serviceType", "address", "dueDate", "tracNumber", "notes"],
  contact: ["name", "phone", "email", "contactPreference"],
} as const satisfies Record<string, readonly (keyof RequestFields)[]>;

export const MAX_LENGTH: Record<keyof RequestFields, number> = {
  serviceType: 50,
  address: 200,
  dueDate: 10,
  notes: 1000,
  tracNumber: 30,
  name: 100,
  phone: 30,
  email: 200,
  contactPreference: 10,
};

export const EMPTY_REQUEST: RequestFields = {
  serviceType: "",
  address: "",
  dueDate: "",
  notes: "",
  tracNumber: "",
  name: "",
  phone: "",
  email: "",
  contactPreference: "",
};

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** The longest TRAC number we accept. Their length varies between water providers. */
const MAX_TRAC_DIGITS = 20;

/**
 * A TRAC number as just its digits: "TRAC# 17408", "TRAC no. 17408" and "17 408" all become
 * "17408". Anything else is returned trimmed but otherwise unchanged, so the check can reject it.
 */
export function normalizeTracNumber(value: string): string {
  const withoutLabel = value.trim().replace(/^TRAC\s*(#|no\.?|number)?\s*:?\s*/i, "");
  const digits = withoutLabel.replace(/[\s-]/g, "");
  return /^\d+$/.test(digits) ? digits : withoutLabel;
}

/** What's wrong with each field, in plain words. An empty object means it's all fine. */
export function fieldErrors(fields: RequestFields): FieldErrors {
  const errors: FieldErrors = {};
  const f = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, value.trim()]),
  ) as RequestFields;

  if (!(SERVICE_TYPES as readonly string[]).includes(f.serviceType)) {
    errors.serviceType = "Choose a service.";
  }
  if (f.address.length < 5) errors.address = "Enter the address where the work is needed.";
  if (!f.dueDate) {
    if (needsDueDate(f.serviceType)) errors.dueDate = "Enter the due date on your notice.";
  } else if (!isRealDate(f.dueDate)) {
    errors.dueDate = needsDueDate(f.serviceType)
      ? "Enter a real date."
      : "Enter a real date, or leave it empty.";
  }
  // Only backflow testing has a TRAC number; for other services the field is hidden and ignored.
  if (f.serviceType === BACKFLOW) {
    const trac = normalizeTracNumber(f.tracNumber);
    if (!trac) errors.tracNumber = "Enter the TRAC number on your notice.";
    else if (!/^\d+$/.test(trac) || trac.length > MAX_TRAC_DIGITS) {
      errors.tracNumber = "Enter the TRAC number's digits, like 17408.";
    }
  }
  if (!f.name) errors.name = "Enter your name.";
  const digits = f.phone.replace(/\D/g, "").length;
  if (digits < 7 || digits > 15) errors.phone = "Enter a phone number we can reach you on.";
  const prefersEmail = f.contactPreference === "Email";
  if (!(CONTACT_PREFERENCES as readonly string[]).includes(f.contactPreference)) {
    errors.contactPreference = "Choose how you'd like the business to reach you.";
  }
  if (!f.email) {
    if (prefersEmail) errors.email = "Enter your email, so the business can reach you by email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
    errors.email = prefersEmail
      ? "Enter a valid email."
      : "Enter a valid email, or leave it empty.";
  }

  for (const key of Object.keys(MAX_LENGTH) as (keyof RequestFields)[]) {
    if (key === "tracNumber" && f.serviceType !== BACKFLOW) continue; // hidden, and not saved
    if (f[key].length > MAX_LENGTH[key]) {
      errors[key] = `Keep this under ${MAX_LENGTH[key]} characters.`;
    }
  }
  return errors;
}

/** A checked request, ready to save. */
export type NewOrder = {
  serviceType: string;
  address: string;
  dueDate: Date | null;
  notes: string | null;
  tracNumber: string | null;
  customer: {
    name: string;
    phone: string;
    email: string | null;
    contactPreference: (typeof CONTACT_PREFERENCE_VALUES)[ContactPreferenceLabel];
  };
};

/** Checks the JSON the browser sent and turns it into a NewOrder. */
export function parseOrderRequest(
  body: unknown,
): { ok: true; order: NewOrder } | { ok: false; error: string; fields: FieldErrors } {
  const raw = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const fields = { ...EMPTY_REQUEST };
  for (const key of Object.keys(EMPTY_REQUEST) as (keyof RequestFields)[]) {
    const value = raw[key] ?? "";
    if (typeof value !== "string") {
      return { ok: false, error: `${key} must be text`, fields: { [key]: "Must be text." } };
    }
    fields[key] = value.trim();
  }

  const errors = fieldErrors(fields);
  const first = Object.values(errors)[0];
  if (first) return { ok: false, error: first, fields: errors };

  return {
    ok: true,
    order: {
      serviceType: fields.serviceType,
      address: fields.address,
      // Noon UTC, so the date stays the same in every US time zone.
      dueDate: fields.dueDate ? new Date(`${fields.dueDate}T12:00:00Z`) : null,
      notes: fields.notes || null,
      tracNumber:
        fields.serviceType === BACKFLOW && fields.tracNumber
          ? normalizeTracNumber(fields.tracNumber)
          : null,
      customer: {
        name: fields.name,
        phone: fields.phone,
        email: fields.email || null,
        contactPreference:
          CONTACT_PREFERENCE_VALUES[fields.contactPreference as ContactPreferenceLabel],
      },
    },
  };
}
