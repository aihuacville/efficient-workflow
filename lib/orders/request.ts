// Checks a customer's service request. No database access: the form uses it to show errors as
// the customer goes, and the server uses it again, because anyone can call the API directly.

export const SERVICE_TYPES = [
  "Fire safety inspection",
  "Backflow testing",
  "Lawn care",
  "Other",
] as const;

/** The form's fields, as typed. Optional ones are empty strings when left blank. */
export type RequestFields = {
  serviceType: string;
  address: string;
  dueDate: string;
  notes: string;
  name: string;
  phone: string;
  email: string;
};

export type FieldErrors = Partial<Record<keyof RequestFields, string>>;

/** Which fields each form step asks for, so the form can check one step at a time. */
export const STEP_FIELDS = {
  details: ["serviceType", "address", "dueDate", "notes"],
  contact: ["name", "phone", "email"],
} as const satisfies Record<string, readonly (keyof RequestFields)[]>;

export const MAX_LENGTH: Record<keyof RequestFields, number> = {
  serviceType: 50,
  address: 200,
  dueDate: 10,
  notes: 1000,
  name: 100,
  phone: 30,
  email: 200,
};

export const EMPTY_REQUEST: RequestFields = {
  serviceType: "",
  address: "",
  dueDate: "",
  notes: "",
  name: "",
  phone: "",
  email: "",
};

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
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
  if (f.dueDate && !isRealDate(f.dueDate)) errors.dueDate = "Enter a real date, or leave it empty.";
  if (!f.name) errors.name = "Enter your name.";
  const digits = f.phone.replace(/\D/g, "").length;
  if (digits < 7 || digits > 15) errors.phone = "Enter a phone number we can reach you on.";
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
    errors.email = "Enter a valid email, or leave it empty.";
  }

  for (const key of Object.keys(MAX_LENGTH) as (keyof RequestFields)[]) {
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
  customer: { name: string; phone: string; email: string | null };
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
      customer: { name: fields.name, phone: fields.phone, email: fields.email || null },
    },
  };
}
