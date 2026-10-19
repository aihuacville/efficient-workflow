import { describe, expect, it } from "vitest";
import { z } from "zod";
import { NoticeExtractionSchema } from "./schema";

const sample = {
  isNotice: true,
  recipientName: "Blue Door Cafe",
  address: { line1: "12 Main St", line2: null, city: "Springfield", state: "IL", postalCode: "62701" },
  issuingAuthority: "Springfield Fire Department",
  noticeId: "FS-2026-0412",
  noticeDate: "2026-10-01",
  dueDate: "2026-11-15",
  serviceType: "fire_safety_inspection",
  summary: "Annual fire extinguisher inspection is due by November 15.",
  lowConfidenceFields: ["noticeId"],
};

describe("NoticeExtractionSchema", () => {
  it("accepts a well-formed extraction", () => {
    expect(NoticeExtractionSchema.parse(sample)).toEqual(sample);
  });

  it("rejects non-ISO dates", () => {
    expect(NoticeExtractionSchema.safeParse({ ...sample, dueDate: "11/15/2026" }).success).toBe(false);
  });

  it("produces a JSON schema the structured-output API accepts", () => {
    const schema = z.toJSONSchema(NoticeExtractionSchema) as Record<string, unknown>;
    // Structured outputs require closed objects with every property required.
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(Object.keys(sample));
  });
});
