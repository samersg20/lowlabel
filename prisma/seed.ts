import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_METHODS = [
  { name: "QUENTE", durationValue: 3, durationUnit: "hours" },
  { name: "PISTA FRIA", durationValue: 3, durationUnit: "hours" },
  { name: "DESCONGELANDO", durationValue: 3, durationUnit: "days" },
  { name: "RESFRIADO", durationValue: 3, durationUnit: "days" },
  { name: "CONGELADO", durationValue: 30, durationUnit: "days" },
  { name: "AMBIENTE", durationValue: 30, durationUnit: "days" },
];

async function main() {
  console.log("🌱 Seeding default methods...");

  const tenants = await prisma.tenant.findMany({
    select: { id: true },
  });

  if (tenants.length === 0) {
    console.log("⚠️ No tenants found. Skipping method seed.");
    return;
  }

  for (const tenant of tenants) {
    for (const method of DEFAULT_METHODS) {
      await prisma.method.upsert({
        where: {
          tenantId_name: {
            tenantId: tenant.id,
            name: method.name,
          },
        },
        update: {
          durationValue: method.durationValue,
          durationUnit: method.durationUnit,
        },
        create: {
          ...method,
          tenantId: tenant.id,
        },
      });
    }
  }

  console.log(`✅ Methods ensured for ${tenants.length} tenant(s).`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });