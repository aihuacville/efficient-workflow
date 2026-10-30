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
      dueDate: true,
      visitStart: true,
      createdAt: true,
      business: { select: { id: true, name: true } },
      technician: { select: { name: true } },
      events: { select: { toStatus: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      rating: { select: { stars: true, comment: true } },
    },
  });
}

/**
 * Every open job, oldest first, for the dispatcher's page. Dispatchers work for the platform,
 * so this is the one query that isn't filtered by businessId.
 */
export async function listOpenOrders() {
  return prisma.order.findMany({
    where: { status: { notIn: ["CONFIRMED", "CANCELLED"] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      serviceType: true,
      address: true,
      dueDate: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      businessId: true,
      technicianId: true,
      business: { select: { name: true } },
    },
  });
}
