import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { NoticeExtractionSchema, SERVICE_TYPES, type NoticeExtraction } from "./schema";

export const EXTRACTION_MODEL = "claude-sonnet-5-5";

export const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

/** The API's per-image limit. Callers should downscale before this point. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const SYSTEM_PROMPT = `You read photos of official notices (government, utility, landlord, insurer, inspection letters) that a small business customer received, and extract the details needed to book the service the notice requires.

Extract only what is printed on the notice. If a field is missing or illegible, return null rather than guessing, and list any field you are unsure of in lowConfidenceFields. Normalize dates to YYYY-MM-DD. For serviceType, pick the closest match from: ${SERVICE_TYPES.join(", ")}; use "other" if none fit. If the image is not a notice at all, set isNotice to false and leave the other fields null.`;

// Structured outputs take plain JSON Schema; drop the $schema marker Zod adds.
const { $schema: _ignored, ...outputSchema } = z.toJSONSchema(NoticeExtractionSchema) as Record<
  string,
  unknown
>;

export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly reason: "refused" | "truncated" | "invalid_output",
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

export interface ExtractNoticeInput {
  image: Uint8Array;
  mediaType: SupportedMediaType;
}

export async function extractNotice(
  { image, mediaType }: ExtractNoticeInput,
  client: Anthropic = new Anthropic(),
): Promise<NoticeExtraction> {
  const response = await client.beta.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 16000,
    // If a safety classifier declines, the API retries on Anthropic's recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    // Reading one page is simple; medium keeps latency down without hurting accuracy.
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: outputSchema },
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: Buffer.from(image).toString("base64") },
          },
          { type: "text", text: "Extract the details from this notice." },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new ExtractionError("The model declined to read this image", "refused");
  }
  if (response.stop_reason === "max_tokens") {
    throw new ExtractionError("The model's response was cut off", "truncated");
  }

  const text = response.content.find((b) => b.type === "text")?.text;
  const parsed = NoticeExtractionSchema.safeParse(text ? JSON.parse(text) : undefined);
  if (!parsed.success) {
    throw new ExtractionError(`Unexpected extraction output: ${parsed.error.message}`, "invalid_output");
  }
  return parsed.data;
}
