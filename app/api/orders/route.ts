import { createOrder } from "@/lib/orders/create";
import { parseOrderRequest } from "@/lib/orders/request";

// Customers send service requests here. No sign-in, so anyone can call it: rate limiting is on
// the pilot list.

/** POST /api/orders with the request form's fields: saves a new order. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send the request as JSON" }, { status: 400 });
  }

  const parsed = parseOrderRequest(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error, fields: parsed.fields }, { status: 400 });
  }

  const { trackingToken } = await createOrder(parsed.order);
  return Response.json({ trackingToken, trackingUrl: `/track/${trackingToken}` }, { status: 201 });
}
