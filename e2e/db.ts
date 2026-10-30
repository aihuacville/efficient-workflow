import { prisma } from "@/lib/db";

// Database steps for the end-to-end tests, run with tsx (see dbStep in full-job.e2e.ts):
// Playwright's test loader can't load Prisma's generated client directly.
//   tsx e2e/db.ts history <address>   prints the job's history as JSON
//   tsx e2e/db.ts cleanup <address>   deletes the test job and its customer

const [command, address] = process.argv.slice(2);

async function main() {
  if (!address) throw new Error("Usage: tsx e2e/db.ts history|cleanup <address>");
  if (command === "history") {
    const events = await prisma.orderEvent.findMany({
      where: { order: { address } },
      orderBy: { createdAt: "asc" },
      select: { toStatus: true, actor: { select: { name: true } } },
    });
    console.log(
      JSON.stringify(events.map((e) => `${e.toStatus} by ${e.actor?.name ?? "customer"}`)),
    );
  } else if (command === "cleanup") {
    // Deleting the order also deletes its events and rating.
    await prisma.order.deleteMany({ where: { address } });
    await prisma.customer.deleteMany({ where: { name: "E2E Customer", orders: { none: {} } } });
  }
}

main().finally(() => prisma.$disconnect());
