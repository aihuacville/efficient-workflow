import Anthropic from "@anthropic-ai/sdk";
import {
  ExtractionError,
  MAX_IMAGE_BYTES,
  SUPPORTED_MEDIA_TYPES,
  extractNotice,
  type SupportedMediaType,
} from "@ew/extraction";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const isSupported = (t: string): t is SupportedMediaType =>
  (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(t);

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a photo as 'image'" }, { status: 400 });
  }
  if (!isSupported(file.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, WebP, or GIF image" }, { status: 415 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Photo is larger than 5 MB" }, { status: 413 });
  }

  try {
    const extraction = await extractNotice({
      image: new Uint8Array(await file.arrayBuffer()),
      mediaType: file.type,
    });
    return NextResponse.json({ extraction });
  } catch (e) {
    if (e instanceof ExtractionError) {
      return NextResponse.json({ error: e.message, reason: e.reason }, { status: 422 });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Busy right now, try again shortly" }, { status: 503 });
    }
    if (e instanceof Anthropic.APIError) {
      console.error("extraction API error", e.status, e.message);
      return NextResponse.json({ error: "Extraction service unavailable" }, { status: 502 });
    }
    throw e;
  }
}
