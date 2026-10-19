import { z } from "zod";

export const SERVICE_TYPES = [
  "fire_safety_inspection",
  "backflow_testing",
  "elevator_inspection",
  "electrical_inspection",
  "plumbing_repair",
  "hvac_repair",
  "pest_control",
  "other",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  fire_safety_inspection: "Fire safety inspection",
  backflow_testing: "Backflow testing",
  elevator_inspection: "Elevator inspection",
  electrical_inspection: "Electrical inspection",
  plumbing_repair: "Plumbing repair",
  hvac_repair: "HVAC repair",
  pest_control: "Pest control",
  other: "Other",
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const AddressSchema = z.strictObject({
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
});

export const EXTRACTED_FIELDS = [
  "recipientName",
  "address",
  "issuingAuthority",
  "noticeId",
  "noticeDate",
  "dueDate",
  "serviceType",
] as const;

/**
 * What the model returns for a photo of a notice. Every field is present; anything
 * not legible on the notice is null. Sent to the API as the structured-output schema.
 */
export const NoticeExtractionSchema = z.strictObject({
  isNotice: z.boolean().describe("False if the image is not an official notice or letter"),
  recipientName: z.string().nullable().describe("Person or business the notice is addressed to"),
  address: AddressSchema.nullable().describe("Service address the notice concerns"),
  issuingAuthority: z.string().nullable().describe("Agency or organization that issued it"),
  noticeId: z.string().nullable().describe("Case, permit, violation, or reference number"),
  noticeDate: isoDate.nullable().describe("Date the notice was issued, YYYY-MM-DD"),
  dueDate: isoDate.nullable().describe("Deadline to comply or schedule service, YYYY-MM-DD"),
  serviceType: z.enum(SERVICE_TYPES).describe("Closest matching service type"),
  summary: z.string().describe("One or two plain-English sentences on what the notice requires"),
  lowConfidenceFields: z
    .array(z.enum(EXTRACTED_FIELDS))
    .describe("Fields that were blurry, ambiguous, or guessed and the user should double-check"),
});

export type NoticeExtraction = z.infer<typeof NoticeExtractionSchema>;
