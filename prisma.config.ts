import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma doesn't read .env files itself. On a laptop, load .env.local (the Neon dev branch);
// on Vercel the variables are already set.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// Migrations use a direct connection, as Neon recommends: the same host without "-pooler".
// Vercel's Neon integration provides it as DATABASE_URL_UNPOOLED.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL?.replace("-pooler.", ".");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url },
});
