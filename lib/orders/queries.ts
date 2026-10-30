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

const DAY = 24 * 60 * 60 * 1000;

const staffJobFields = {
  id: true,
  status: true,
  serviceType: true,
  address: true,
  dueDate: true,
  notes: true,
  updatedAt: true,
  visitStart: true,
  businessId: true,
  technicianId: true,
  technician: { select: { name: true } },
  customer: { select: { name: true, phone: true } },
} as const;

/**
 * One business's jobs: open ones, plus those confirmed in the last 30 days. Always filtered by
 * businessId, so a business never sees another's jobs.
 */
export async function listBusinessOrders(businessId: string) {
  const orders = await prisma.order.findMany({
    where: {
      businessId,
      OR: [
        { status: { notIn: ["CONFIRMED", "CANCELLED"] } },
        { status: "CONFIRMED", updatedAt: { gte: new Date(Date.now() - 30 * DAY) } },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: {
      ...staffJobFields,
      rating: { select: { stars: true } },
      // What the customer wrote, if they reported a problem.
      events: {
        where: { toStatus: "PROBLEM_REPORTED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { note: true },
      },
    },
  });
  // A business sees the customer's contact details only once it has accepted the job.
  return orders.map((o) => ({ ...o, customer: o.status === "OFFERED" ? null : o.customer }));
}

/** A technician's upcoming and active visits, soonest first. */
export async function listTechnicianOrders(technicianId: string) {
  return prisma.order.findMany({
    where: { technicianId, status: { in: ["SCHEDULED", "ON_THE_WAY", "IN_PROGRESS"] } },
    orderBy: { visitStart: "asc" },
    select: staffJobFields,
  });
}
