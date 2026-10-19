import { NoticeExtractionSchema, SERVICE_TYPES } from "@ew/extraction";
import { z } from "zod";

const optionalText = z.string().trim().max(200);

/**
 * The review form's shape. Shared by the client form and POST /api/v1/orders.
 * Optional text fields are "" when blank so they bind cleanly to inputs.
 */
export const OrderRequestSchema = z
  .object({
    contactName: z.string().trim().min(1, "Required").max(200),
    contactEmail: z.union([z.literal(""), z.email("Enter a valid email")]),
    contactPhone: optionalText,
    notifyPref: z.enum(["EMAIL", "SMS"]),
    address: z.object({
      line1: z.string().trim().min(1, "Required").max(200),
      line2: optionalText,
      city: z.string().trim().min(1, "Required").max(100),
      state: z.string().trim().min(1, "Required").max(50),
      postalCode: z.string().trim().min(1, "Required").max(20),
    }),
    serviceType: z.enum(SERVICE_TYPES),
    issuingAuthority: optionalText,
    noticeId: optionalText,
    dueDate: z.union([z.literal(""), z.iso.date("Use YYYY-MM-DD")]),
    notes: z.string().trim().max(2000),
    extraction: NoticeExtractionSchema.nullable(),
  })
  .refine((v) => v.notifyPref !== "EMAIL" || v.contactEmail !== "", {
    path: ["contactEmail"],
    message: "Needed for email updates",
  })
  .refine((v) => v.notifyPref !== "SMS" || v.contactPhone !== "", {
    path: ["contactPhone"],
    message: "Needed for text updates",
  });

export type OrderRequest = z.infer<typeof OrderRequestSchema>;
