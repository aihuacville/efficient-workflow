import { type Action, ACTIONS } from "@/lib/orders/status";
import { type ActionRequest, applyAction } from "@/lib/orders/transition";
import { getCurrentUser, toActor } from "@/lib/session";

// Every staff button that moves a job (Offer, Accept, On my way, ...) calls this. The workflow
// rules decide whether the signed-in person may do it; this file only reads the request and
// turns the answer into a status code.

const STATUS_CODES = {
  input: 400,
  person: 403,
  not_found: 404,
  status: 409,
  conflict: 409,
} as const;

/**
 * POST /api/orders/<id>/actions with { "action": "offer", ...details }.
 * Details, when the action needs them: businessId, technicianId, visitStart (ISO date), note.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Choose an account in the switcher first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Send the action as JSON" }, { status: 400 });
  }
  const { action, businessId, technicianId, visitStart, note } = body;
  if (typeof action !== "string" || !(ACTIONS as string[]).includes(action)) {
    return Response.json(
      { error: `action must be one of: ${ACTIONS.join(", ")}` },
      { status: 400 },
    );
  }

  const details: ActionRequest = {};
  for (const [key, value] of Object.entries({ businessId, technicianId, note })) {
    if (value === undefined) continue;
    if (typeof value !== "string" || value.length > 1000) {
      return Response.json({ error: `${key} must be text` }, { status: 400 });
    }
    details[key as "businessId" | "technicianId" | "note"] = value;
  }
  if (visitStart !== undefined) {
    const date = typeof visitStart === "string" ? new Date(visitStart) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return Response.json({ error: "visitStart must be a date and time" }, { status: 400 });
    }
    details.visitStart = date;
  }

  const result = await applyAction(
    { id: (await params).id },
    action as Action,
    toActor(user),
    details,
  );
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: STATUS_CODES[result.reason] });
  }
  return Response.json({ status: result.status });
}
