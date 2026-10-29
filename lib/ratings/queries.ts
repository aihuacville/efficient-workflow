import { prisma } from "@/lib/db";
import type { NewRating } from "./input";

/** A rating as the browser sees it. */
export type Review = { id: string; stars: number; comment: string; createdAt: string };

const reviewFields = { id: true, stars: true, comment: true, createdAt: true } as const;

function toReview(row: { id: string; stars: number; comment: string; createdAt: Date }): Review {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

type RateResult =
  | { ok: true; review: Review; changed: boolean }
  | { ok: false; reason: "not_found" | "not_confirmed"; error: string };

/**
 * Saves the customer's rating of their job. The tracking token proves it's their job, and they
 * can rate only after confirming the work is done. Rating again changes the earlier rating.
 */
export async function rateOrder({ trackingToken, stars, comment }: NewRating): Promise<RateResult> {
  const order = await prisma.order.findUnique({
    where: { trackingToken },
    select: { id: true, status: true, businessId: true, rating: { select: { id: true } } },
  });
  if (!order) return { ok: false, reason: "not_found", error: "We couldn't find that job." };
  if (order.status !== "CONFIRMED" || !order.businessId) {
    return {
      ok: false,
      reason: "not_confirmed",
      error: "You can rate the job once you've confirmed the work is done.",
    };
  }

  // One rating per order (orderId is unique), so upsert: create it, or update the existing one.
  const saved = await prisma.rating.upsert({
    where: { orderId: order.id },
    create: { orderId: order.id, businessId: order.businessId, stars, comment },
    update: { stars, comment },
    select: reviewFields,
  });
  return { ok: true, review: toReview(saved), changed: order.rating !== null };
}

/** A business's reviews, newest first. */
export async function listReviews(businessId: string): Promise<Review[]> {
  const rows = await prisma.rating.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    select: reviewFields,
  });
  return rows.map(toReview);
}
