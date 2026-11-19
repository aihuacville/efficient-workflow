import Anthropic from "@anthropic-ai/sdk";
import {
  type AutofillFields,
  isEmptyAutofill,
  NOTICE_SCHEMA,
  NOTICE_SYSTEM_PROMPT,
  type PhotoType,
  toAutofillFields,
} from "./notice";

// Sends a photo of a notice to Claude and returns the form fields it could read. The photo is
// sent once and not stored, here or by us anywhere else.

export type ReadNoticeResult =
  | { ok: true; fields: AutofillFields }
  | { ok: false; reason: "off" | "unreadable" | "busy" | "failed" };

/** How long to wait for Claude before giving up; the customer can still type the details. */
const TIMEOUT_MS = 25_000;

let client: Anthropic | null = null;

/** Autofill is off when no API key is set, so the form simply skips it. */
export function autofillEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function readNotice(photo: {
  data: string; // base64
  type: PhotoType;
}): Promise<ReadNoticeResult> {
  if (!autofillEnabled()) return { ok: false, reason: "off" };
  client ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      // Reading one notice is a simple task: low effort keeps the customer's wait short.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: NOTICE_SCHEMA },
      },
      // If the model declines (rare for a photo of a letter), the API retries on a fallback
      // model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: NOTICE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: photo.type, data: photo.data } },
            { type: "text", text: "Fill in the service request from this notice." },
          ],
        },
      ],
    });

    if (response.stop_reason !== "end_turn") {
      console.warn("autofill: stopped early", response.stop_reason, response.stop_details);
      return { ok: false, reason: "unreadable" };
    }
    const answer = response.content.find((block) => block.type === "text")?.text ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(answer);
    } catch {
      console.warn("autofill: answer wasn't JSON");
      return { ok: false, reason: "unreadable" };
    }
    const fields = toAutofillFields(parsed);
    return isEmptyAutofill(fields) ? { ok: false, reason: "unreadable" } : { ok: true, fields };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return { ok: false, reason: "busy" };
    if (error instanceof Anthropic.APIError) {
      console.error("autofill: API error", error.status, error.message);
    } else {
      console.error("autofill: failed", error);
    }
    return { ok: false, reason: "failed" };
  }
}
