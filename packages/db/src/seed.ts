import "dotenv/config";
import { SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@ew/extraction";
import { prisma } from "./index";

async function main() {
  for (const id of SERVICE_TYPES) {
    await prisma.serviceType.upsert({
      where: { id },
      update: { name: SERVICE_TYPE_LABELS[id] },
      create: { id, name: SERVICE_TYPE_LABELS[id] },
    });
  }

  const users = [
    { email: "customer@demo.local", name: "Demo Customer", roles: ["CUSTOMER"] },
    { email: "owner@demo.local", name: "Demo Owner", roles: ["OWNER", "STAFF"] },
    { email: "staff@demo.local", name: "Demo Staff", roles: ["STAFF"] },
    { email: "admin@demo.local", name: "Demo Admin", roles: ["ADMIN"] },
  ] as const;
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, roles: [...u.roles] },
    });
  }

  const owner = await prisma.user.findUniqueOrThrow({ where: { email: "owner@demo.local" } });
  const existing = await prisma.business.findFirst({ where: { ownerId: owner.id } });
  const business =
    existing ??
    (await prisma.business.create({
      data: { ownerId: owner.id, name: "Springfield Safety Co.", rating: 4.7, verified: true },
    }));

  // Downtown Springfield, IL, with a 25 km service radius.
  await prisma.$executeRaw`
    UPDATE businesses
    SET location = ST_SetSRID(ST_MakePoint(-89.6501, 39.7817), 4326)::geography,
        service_area = ST_Buffer(ST_SetSRID(ST_MakePoint(-89.6501, 39.7817), 4326)::geography, 25000)
    WHERE id = ${business.id}`;

  for (const [serviceTypeId, basePrice] of [
    ["fire_safety_inspection", 149],
    ["backflow_testing", 119],
  ] as const) {
    await prisma.businessService.upsert({
      where: { businessId_serviceTypeId: { businessId: business.id, serviceTypeId } },
      update: { basePrice },
      create: { businessId: business.id, serviceTypeId, basePrice },
    });
  }

  console.log("Seeded service types, demo users, and 1 business.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
