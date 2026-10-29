import { prisma } from "@/lib/db";
import type { NewOrder } from "./request";

/**
 * Saves a customer's request as a new order, with its customer and its first history entry
 * ("Request received"). One nested create, so Prisma saves all three or none.
 */
export async function createOrder({ customer, ...order }: NewOrder) {
  return prisma.order.create({
    data: {
      ...order,
      customer: { create: customer },
      // No actorId: the customer made this change, and customers aren't staff users.
      events: { create: { toStatus: "NEW" } },
    },
    select: { trackingToken: true },
  });
}
