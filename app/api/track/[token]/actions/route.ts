import { REFUSAL_STATUS } from "@/lib/orders/http";
import { applyAction } from "@/lib/orders/transition";

// The customer's buttons on their tracking page. Customers don't sign in: the tracking token in
// the URL proves it's their job. The workflow rules still decide whether the action is allowed.

const CUSTOMER_ACTIONS = ["confirm", "reportProblem"] as const;

/** POST /api/track/<token>/actions with { "action": "confirm" } or { "action": "reportProblem", "note": "..." }. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = CUSTOMER_ACTIONS.find((a) => a === body?.action);
  if (!action) {
    return Response.json(
      { error: `action must be one of: ${CUSTOMER_ACTIONS.join(", ")}` },
      { status: 400 },
    );
  }
  const note = body?.note;
  if (note !== undefined && (typeof note !== "string" || note.length > 1000)) {
    return Response.json({ error: "note must be text, 1000 characters or fewer" }, { status: 400 });
  }

  const result = await applyAction(
    { trackingToken: (await params).token },
    action,
    { kind: "customer" },
    { note },
  );
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: REFUSAL_STATUS[result.reason] });
  }
  return Response.json({ status: result.status });
}
