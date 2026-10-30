import { prisma } from "@/lib/db";

/** Every business, for the dispatcher to choose from when offering a job. */
export async function listBusinesses() {
  return prisma.business.findMany({
    select: { id: true, name: true, services: true },
    orderBy: { name: "asc" },
  });
}
