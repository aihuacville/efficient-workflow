import { prisma } from "@/lib/db";

/** What the customer's tracking page shows, found by the secret token in their link. */
export async function getTrackedOrder(trackingToken: string) {
  return prisma.order.findUnique({
    where: { trackingToken },
    select: {
      trackingToken: true,
      status: true,
      serviceType: true,
      address: true,
      visitStart: true,
      business: { select: { id: true, name: true } },
    },
  });
}
