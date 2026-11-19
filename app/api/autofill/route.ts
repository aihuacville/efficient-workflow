import { type PhotoType, photoProblem } from "@/lib/autofill/notice";
import { readNotice } from "@/lib/autofill/read-notice";

// The request form sends the customer's photo of their notice here, and gets back the details
// Claude could read from it. No sign-in, like the request form itself; rate limiting is on the
// pilot list, so keep a spending limit on the API key.

// Claude can take up to 25 seconds; Vercel's default limit for a function is shorter on some plans.
export const maxDuration = 30;

const MESSAGES = {
  off: "Reading photos isn't turned on. Type the details instead.",
  unreadable: "We couldn't read the notice. Type the details instead.",
  busy: "We're busy right now. Type the details instead.",
  failed: "Something went wrong reading the photo. Type the details instead.",
} as const;

const STATUS = { off: 503, unreadable: 422, busy: 503, failed: 502 } as const;

/** POST /api/autofill with form data `photo`: returns `{ fields }` to fill in the request form. */
export async function POST(request: Request) {
  let photo: FormDataEntryValue | null;
  try {
    photo = (await request.formData()).get("photo");
  } catch {
    return Response.json({ error: "Send the photo as form data." }, { status: 400 });
  }
  if (!(photo instanceof File)) {
    return Response.json({ error: "Send a photo." }, { status: 400 });
  }
  const problem = photoProblem(photo);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const data = Buffer.from(await photo.arrayBuffer()).toString("base64");
  const result = await readNotice({ data, type: photo.type as PhotoType });
  if (!result.ok) {
    return Response.json(
      { error: MESSAGES[result.reason], reason: result.reason },
      { status: STATUS[result.reason] },
    );
  }
  return Response.json({ fields: result.fields });
}
