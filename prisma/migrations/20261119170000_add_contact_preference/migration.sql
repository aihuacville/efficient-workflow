-- CreateEnum
CREATE TYPE "ContactPreference" AS ENUM ('CALL', 'TEXT', 'EMAIL');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "contactPreference" "ContactPreference";

