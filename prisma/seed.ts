import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

// Demo data: two businesses, the demo staff (a dispatcher, owners and technicians), a confirmed
// job to rate (tracking link /track/demo) and a few past reviews. Run with `pnpm db:seed`.
// Safe to run again: businesses and staff are updated in place, and the demo customer's jobs are
// deleted and added fresh. Jobs you created yourself are left alone.
// `pnpm db:reset-demo` (this file with --reset) first deletes every job and customer, for a
// clean start before a run-through or the demo.
// It writes to whichever database DATABASE_URL_UNPOOLED or DATABASE_URL points to: on a laptop,
// the Neon dev branch.

// DATABASE_URL_UNPOOLED first, like the migrations (prisma.config.ts), so one variable set on the
// command line points both at the same database. See "Updating the live database" in the README.
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  }),
});

const BUSINESS_ID = "demo_abc_fire";
const CUSTOMER_ID = "demo_customer";

const BUSINESSES = [
  {
    id: BUSINESS_ID,
    name: "ABC Fire Safety",
    services: ["Fire safety inspection", "Backflow testing"],
    lat: 39.7817,
    lng: -89.6501,
  },
  {
    id: "demo_greenleaf",
    name: "GreenLeaf Lawn Care",
    services: ["Lawn care"],
    lat: 39.8017,
    lng: -89.6437,
  },
];

// The people in the demo account switcher.
const STAFF = [
  { id: "demo_dispatcher", name: "Dana Lee", role: "DISPATCHER", businessId: null },
  { id: "demo_owner_abc", name: "Omar Hassan", role: "OWNER", businessId: BUSINESS_ID },
  { id: "demo_tech_alex", name: "Alex Kim", role: "TECHNICIAN", businessId: BUSINESS_ID },
  { id: "demo_tech_jordan", name: "Jordan Patel", role: "TECHNICIAN", businessId: BUSINESS_ID },
  { id: "demo_owner_green", name: "Grace Liu", role: "OWNER", businessId: "demo_greenleaf" },
  { id: "demo_tech_chris", name: "Chris Moore", role: "TECHNICIAN", businessId: "demo_greenleaf" },
] as const;
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
  if (process.argv.includes("--reset")) {
    // Every job and customer, not just the demo's. Deleting jobs also deletes their ratings and
    // history; businesses and staff stay, and are updated below.
    const jobs = await prisma.order.deleteMany();
    const customers = await prisma.customer.deleteMany();
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
    console.log(
      `Reset: deleted ${plural(jobs.count, "job")} and ${plural(customers.count, "customer")}.`,
    );
  }

  // Upsert (create, or update in place) rather than delete: jobs you created may point at these.
  for (const { id, ...data } of BUSINESSES) {
    await prisma.business.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
  for (const { id, ...data } of STAFF) {
    const email = `${id.replace("demo_", "").replace("_", ".")}@demo.example`;
    await prisma.user.upsert({
      where: { id },
      create: { id, email, ...data },
      update: { email, ...data },
    });
  }

  // The demo customer's jobs: deleting them also deletes their ratings and events.
  await prisma.order.deleteMany({ where: { customerId: CUSTOMER_ID } });
  await prisma.customer.deleteMany({ where: { id: CUSTOMER_ID } });
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
    `Demo data ready: ${BUSINESSES.length} businesses, ${STAFF.length} staff, 1 job to rate, ` +
      `${PAST_REVIEWS.length} past reviews.`,
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
