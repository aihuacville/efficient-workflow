import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

// One shared database client for the server. Only code in lib/ should import it; pages call
// lib/ functions, which keeps the "always filter by businessId" rule in one place.
// Uses the pooled DATABASE_URL, which suits many short-lived serverless functions.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. See 'Run locally' in the README.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma = globalForPrisma.prisma ?? createClient();

// In development, Next.js reloads modules on every change; reuse the client instead of
// opening a new set of connections each time.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
