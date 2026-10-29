import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

// Demo data: one business, a confirmed job to rate (tracking link /track/demo) and a few past
// reviews. Run with `pnpm db:seed`. Safe to run again: it deletes the demo rows and adds them fresh.
// It writes to whichever database DATABASE_URL points to: on a laptop, the Neon dev branch.

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const BUSINESS_ID = "demo_abc_fire";
const CUSTOMER_ID = "demo_customer";
const DAY = 24 * 60 * 60 * 1000;

const job = {
  customerId: CUSTOMER_ID,
  businessId: BUSINESS_ID,
  serviceType: "Fire safety inspection",
  status: "CONFIRMED",
} as const;

const PAST_REVIEWS = [
  { daysAgo: 21, address: "48 Elm Ave, Springfield, IL", stars: 5, comment: "Quick and thorough." },
  {
    daysAgo: 14,
    address: "7 Lake Rd, Springfield, IL",
    stars: 4,
    comment: "Arrived a bit late, but great work.",
  },
  { daysAgo: 6, address: "301 Pine St, Springfield, IL", stars: 5, comment: "" },
];

async function main() {
  // Orders first: deleting them also deletes their ratings and events.
  await prisma.order.deleteMany({ where: { customerId: CUSTOMER_ID } });
  await prisma.customer.deleteMany({ where: { id: CUSTOMER_ID } });
  await prisma.business.deleteMany({ where: { id: BUSINESS_ID } });

  await prisma.business.create({
    data: {
      id: BUSINESS_ID,
      name: "ABC Fire Safety",
      services: ["Fire safety inspection"],
      lat: 39.7817,
      lng: -89.6501,
    },
  });
  await prisma.customer.create({
    data: { id: CUSTOMER_ID, name: "Sam Rivera", phone: "555-0100" },
  });

  // The job the demo rates: confirmed by the customer, not rated yet.
  await prisma.order.create({
    data: {
      ...job,
      trackingToken: "demo",
      address: "12 Main St, Springfield, IL",
      visitStart: new Date(),
    },
  });

  for (const { daysAgo, address, stars, comment } of PAST_REVIEWS) {
    const when = new Date(Date.now() - daysAgo * DAY);
    await prisma.order.create({
      data: {
        ...job,
        address,
        visitStart: when,
        createdAt: when,
        rating: { create: { businessId: BUSINESS_ID, stars, comment, createdAt: when } },
      },
    });
  }

  console.log(
    `Demo data ready: ABC Fire Safety, 1 job to rate, ${PAST_REVIEWS.length} past reviews.`,
  );
}

main()
  .catch((error: unknown) => {
    // Hide connection strings, which contain the password, if an error message includes one.
    const message = error instanceof Error ? error.message : String(error);
    console.error(message.replace(/postgres(ql)?:\/\/\S+/g, "postgresql://[hidden]"));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
