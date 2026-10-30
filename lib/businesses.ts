import { prisma } from "@/lib/db";

/** Every business, for the dispatcher to choose from when offering a job. */
export async function listBusinesses() {
  return prisma.business.findMany({
    select: { id: true, name: true, services: true },
    orderBy: { name: "asc" },
  });
}

/** Who can do a business's visits: its technicians, and its owners for owner-operated jobs. */
export async function listVisitors(businessId: string) {
  return prisma.user.findMany({
    where: { businessId, role: { in: ["TECHNICIAN", "OWNER"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}
