import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import type { OrderStatus } from "../lib/generated/prisma/enums";

// Demo data: three businesses, their staff (for the account switcher), and jobs at every stage,
// each with a realistic history, so every page has something to show. Run with `pnpm db:seed`.
// Safe to run again: businesses and staff are updated in place, and the demo customers' jobs are
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

const HOUR = 60 * 60 * 1000;
const FIRE = "Fire safety inspection";
const BACKFLOW = "Backflow testing";
const LAWN = "Lawn care";

const BUSINESSES = [
  {
    id: "demo_abc_fire",
    name: "ABC Fire Safety",
    services: [FIRE, BACKFLOW],
    lat: 39.7817,
    lng: -89.6501,
  },
  {
    id: "demo_greenleaf",
    name: "GreenLeaf Lawn Care",
    services: [LAWN],
    lat: 39.8017,
    lng: -89.6437,
  },
  {
    id: "demo_prairie",
    name: "Prairie Fire & Safety",
    services: [FIRE, BACKFLOW],
    lat: 39.7601,
    lng: -89.6812,
  },
];

// The people in the demo account switcher.
const STAFF = [
  { id: "demo_dispatcher", name: "Dana Lee", role: "DISPATCHER", businessId: null },
  { id: "demo_owner_abc", name: "Omar Hassan", role: "OWNER", businessId: "demo_abc_fire" },
  { id: "demo_tech_alex", name: "Alex Kim", role: "TECHNICIAN", businessId: "demo_abc_fire" },
  { id: "demo_tech_jordan", name: "Jordan Patel", role: "TECHNICIAN", businessId: "demo_abc_fire" },
  { id: "demo_owner_green", name: "Grace Liu", role: "OWNER", businessId: "demo_greenleaf" },
  { id: "demo_tech_chris", name: "Chris Moore", role: "TECHNICIAN", businessId: "demo_greenleaf" },
  { id: "demo_owner_prairie", name: "Priya Shah", role: "OWNER", businessId: "demo_prairie" },
  { id: "demo_tech_luis", name: "Luis Ortiz", role: "TECHNICIAN", businessId: "demo_prairie" },
] as const;

/** Each business's owner, who accepts and schedules its jobs in the history. */
const OWNER_OF: Record<string, string> = {
  demo_abc_fire: "demo_owner_abc",
  demo_greenleaf: "demo_owner_green",
  demo_prairie: "demo_owner_prairie",
};

type DemoJob = {
  /** A readable tracking link (/track/<token>) for jobs worth showing in the demo. */
  token?: string;
  customer: string;
  serviceType: string;
  address: string;
  status: OrderStatus;
  businessId?: string;
  technicianId?: string;
  /** When the request came in. */
  hoursAgo: number;
  /** When the visit is (negative: in the past). */
  visitInHours?: number;
  dueInDays?: number;
  notes?: string;
  /** What the customer wrote when reporting a problem. */
  problem?: string;
  /** Declined by this business before going back to New requests. */
  declined?: { businessId: string; note: string };
  rating?: { stars: number; comment: string };
};

const JOBS: DemoJob[] = [
  // Dispatcher's queue
  {
    token: "demo-new",
    customer: "Maria Gomez",
    serviceType: FIRE,
    address: "48 Maple Ave, Springfield, IL",
    status: "NEW",
    hoursAgo: 2,
    dueInDays: 21,
    notes: "Notice says the inspection is due by the deadline. Office is open 9 to 5.",
  },
  {
    customer: "Kevin Brooks",
    serviceType: FIRE,
    address: "17 River Rd, Springfield, IL",
    status: "NEW",
    hoursAgo: 26,
    dueInDays: 10,
    declined: { businessId: "demo_abc_fire", note: "Fully booked this week" },
  },
  {
    customer: "Linda Park",
    serviceType: LAWN,
    address: "903 Oak Ridge Dr, Springfield, IL",
    status: "NEW",
    hoursAgo: 5,
    notes: "City notice: grass over 10 inches. Back gate is unlocked.",
  },
  // Offers waiting for a business
  {
    token: "demo-offered",
    customer: "Tom Nguyen",
    serviceType: BACKFLOW,
    address: "220 Elm St, Springfield, IL",
    status: "OFFERED",
    businessId: "demo_abc_fire",
    hoursAgo: 20,
    dueInDays: 14,
  },
  // ABC Fire Safety's jobs in progress
  {
    customer: "Rachel Adams",
    serviceType: FIRE,
    address: "9 Lincoln Ct, Springfield, IL",
    status: "ACCEPTED",
    businessId: "demo_abc_fire",
    hoursAgo: 30,
    dueInDays: 12,
  },
  {
    token: "demo-scheduled",
    customer: "David Chen",
    serviceType: FIRE,
    address: "1500 Capitol Ave, Springfield, IL",
    status: "SCHEDULED",
    businessId: "demo_abc_fire",
    technicianId: "demo_tech_alex",
    hoursAgo: 50,
    visitInHours: 42,
    notes: "Ask for the building manager at the front desk.",
  },
  {
    token: "demo-on-the-way",
    customer: "Aisha Johnson",
    serviceType: BACKFLOW,
    address: "77 Walnut St, Springfield, IL",
    status: "ON_THE_WAY",
    businessId: "demo_abc_fire",
    technicianId: "demo_tech_jordan",
    hoursAgo: 40,
    visitInHours: 0.5,
  },
  {
    token: "demo-done",
    customer: "Greg Wilson",
    serviceType: FIRE,
    address: "305 Jefferson St, Springfield, IL",
    status: "DONE",
    businessId: "demo_abc_fire",
    technicianId: "demo_tech_alex",
    hoursAgo: 72,
    visitInHours: -3,
  },
  {
    token: "demo-problem",
    customer: "Nina Patel",
    serviceType: FIRE,
    address: "61 Monroe St, Springfield, IL",
    status: "PROBLEM_REPORTED",
    businessId: "demo_abc_fire",
    technicianId: "demo_tech_jordan",
    hoursAgo: 96,
    visitInHours: -26,
    problem: "The extinguisher in the back stairwell wasn't checked.",
  },
  // The job the customer rates in the demo: confirmed, not rated yet
  {
    token: "demo",
    customer: "Sam Rivera",
    serviceType: FIRE,
    address: "12 Main St, Springfield, IL",
    status: "CONFIRMED",
    businessId: "demo_abc_fire",
    technicianId: "demo_tech_alex",
    hoursAgo: 120,
    visitInHours: -24,
  },
  // Finished jobs with reviews
  ...[
    { hours: 504, address: "48 Elm Ave", stars: 5, comment: "Quick and thorough." },
    { hours: 336, address: "7 Lake Rd", stars: 4, comment: "Arrived a bit late, but great work." },
    { hours: 144, address: "301 Pine St", stars: 5, comment: "" },
  ].map(({ hours, address, stars, comment }, i) => ({
    customer: ["Ben Carter", "Olivia Reed", "Sam Rivera"][i] ?? "Sam Rivera",
    serviceType: FIRE,
    address: `${address}, Springfield, IL`,
    status: "CONFIRMED" as const,
    businessId: "demo_abc_fire",
    technicianId: i === 1 ? "demo_tech_jordan" : "demo_tech_alex",
    hoursAgo: hours,
    visitInHours: -(hours - 48),
    rating: { stars, comment },
  })),
  // GreenLeaf Lawn Care
  {
    customer: "Paul Martin",
    serviceType: LAWN,
    address: "14 Birch Ln, Springfield, IL",
    status: "SCHEDULED",
    businessId: "demo_greenleaf",
    technicianId: "demo_tech_chris",
    hoursAgo: 28,
    visitInHours: 20,
  },
  {
    customer: "Emma Scott",
    serviceType: LAWN,
    address: "820 Cedar St, Springfield, IL",
    status: "CONFIRMED",
    businessId: "demo_greenleaf",
    technicianId: "demo_tech_chris",
    hoursAgo: 200,
    visitInHours: -170,
    rating: { stars: 5, comment: "Lawn looks great, and they cleaned up after." },
  },
  // Prairie Fire & Safety
  {
    customer: "Hannah Lee",
    serviceType: BACKFLOW,
    address: "455 Washington St, Springfield, IL",
    status: "CONFIRMED",
    businessId: "demo_prairie",
    technicianId: "demo_tech_luis",
    hoursAgo: 260,
    visitInHours: -220,
    rating: { stars: 4, comment: "Good work. Had to reschedule once." },
  },
];

/** The usual order of a job's life, as far as "Work done". */
const FLOW: OrderStatus[] = [
  "NEW",
  "OFFERED",
  "ACCEPTED",
  "SCHEDULED",
  "ON_THE_WAY",
  "IN_PROGRESS",
  "DONE",
];

/** Who makes each change in the history. Null: the customer, who isn't a staff user. */
function doneBy(status: OrderStatus, job: DemoJob): string | null {
  if (status === "OFFERED") return "demo_dispatcher";
  if (status === "ACCEPTED" || status === "SCHEDULED") {
    return OWNER_OF[job.businessId ?? ""] ?? null;
  }
  if (status === "ON_THE_WAY" || status === "IN_PROGRESS" || status === "DONE") {
    return job.technicianId ?? null;
  }
  return null; // NEW, CONFIRMED, PROBLEM_REPORTED
}

/** The job's history: each status change, who made it, and any note. */
function historyOf(
  job: DemoJob,
): { status: OrderStatus; by: string | null; note: string | null }[] {
  if (job.declined) {
    return [
      { status: "NEW", by: null, note: null },
      { status: "OFFERED", by: "demo_dispatcher", note: null },
      { status: "NEW", by: OWNER_OF[job.declined.businessId] ?? null, note: job.declined.note },
    ];
  }
  const final = job.status === "CONFIRMED" || job.status === "PROBLEM_REPORTED";
  const steps = final ? [...FLOW, job.status] : FLOW.slice(0, FLOW.indexOf(job.status) + 1);
  return steps.map((status) => ({
    status,
    by: doneBy(status, job),
    note: status === "PROBLEM_REPORTED" ? (job.problem ?? null) : null,
  }));
}

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

  // The demo customers' jobs: deleting them also deletes their ratings and history.
  const demoCustomers = { id: { startsWith: "demo_customer" } };
  await prisma.order.deleteMany({ where: { customer: demoCustomers } });
  await prisma.customer.deleteMany({ where: demoCustomers });

  const now = Date.now();
  for (const [i, job] of JOBS.entries()) {
    const createdAt = new Date(now - job.hoursAgo * HOUR);
    const history = historyOf(job);
    // Space the history out between the request and now (or the visit, if it's in the past).
    const visit = job.visitInHours !== undefined ? now + job.visitInHours * HOUR : now;
    const end = Math.min(now, visit);
    const gap = (end - createdAt.getTime()) / history.length;

    await prisma.order.create({
      data: {
        ...(job.token && { trackingToken: job.token }),
        status: job.status,
        serviceType: job.serviceType,
        address: job.address,
        notes: job.notes ?? null,
        dueDate: job.dueInDays ? new Date(now + job.dueInDays * 24 * HOUR) : null,
        createdAt,
        // When it last changed: its latest history entry, not the moment the seed ran.
        updatedAt: new Date(createdAt.getTime() + (history.length - 1) * gap),
        visitStart: job.visitInHours !== undefined ? new Date(visit) : null,
        customer: {
          create: {
            id: `demo_customer_${i + 1}`,
            name: job.customer,
            phone: `555-01${String(i + 10).padStart(2, "0")}`,
          },
        },
        business: job.businessId && !job.declined ? { connect: { id: job.businessId } } : undefined,
        technician: job.technicianId ? { connect: { id: job.technicianId } } : undefined,
        events: {
          create: history.map((step, n) => ({
            fromStatus: n === 0 ? null : history[n - 1]!.status,
            toStatus: step.status,
            actorId: step.by,
            note: step.note,
            createdAt: new Date(createdAt.getTime() + n * gap),
          })),
        },
        rating:
          job.rating && job.businessId
            ? { create: { ...job.rating, businessId: job.businessId, createdAt: new Date(end) } }
            : undefined,
      },
    });
  }

  const counts = new Map<string, number>();
  for (const job of JOBS) counts.set(job.status, (counts.get(job.status) ?? 0) + 1);
  const summary = [...counts].map(([status, n]) => `${n} ${status.toLowerCase()}`).join(", ");
  console.log(
    `Demo data ready: ${BUSINESSES.length} businesses, ${STAFF.length} staff, ` +
      `${JOBS.length} jobs (${summary}).`,
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
