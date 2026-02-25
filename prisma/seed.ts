import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(name: string, email: string, password: string, role: string, unit: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { name, username: email, email, passwordHash, role, unit },
    });
    return;
  }

  await prisma.user.create({ data: { name, username: email, email, passwordHash, role, unit } });
}

async function upsertGlobalUnit(name: string, email: string) {
  const existing = await prisma.unit.findFirst({ where: { tenantId: null, name } });
  if (existing) {
    await prisma.unit.update({ where: { id: existing.id }, data: { email } });
    return;
  }
  await prisma.unit.create({ data: { name, email, phone: "", managerName: "", tenantId: null } });
}

async function upsertGlobalMethod(method: { name: string; durationValue: number; durationUnit: string }) {
  const existing = await prisma.method.findFirst({ where: { tenantId: null, name: method.name } });
  if (existing) {
    await prisma.method.update({ where: { id: existing.id }, data: method });
    return;
  }
  await prisma.method.create({ data: { ...method, tenantId: null } });
}

async function upsertGlobalGroup(name: string) {
  const existing = await prisma.itemGroup.findFirst({ where: { tenantId: null, name } });
  if (!existing) await prisma.itemGroup.create({ data: { tenantId: null, name } });
}

async function main() {
  await upsertGlobalUnit("BROOKLIN", "brooklin@low.local");
  await upsertGlobalUnit("PINHEIROS", "pinheiros@low.local");

  const methods = [
    { name: "QUENTE", durationValue: 3, durationUnit: "hours" },
    { name: "PISTA FRIA", durationValue: 3, durationUnit: "hours" },
    { name: "DESCONGELANDO", durationValue: 3, durationUnit: "days" },
    { name: "RESFRIADO", durationValue: 3, durationUnit: "days" },
    { name: "CONGELADO", durationValue: 30, durationUnit: "days" },
    { name: "AMBIENTE", durationValue: 30, durationUnit: "days" },
  ];

  for (const method of methods) await upsertGlobalMethod(method);

  await upsertGlobalGroup("Carnes");
  await upsertGlobalGroup("Molhos");

  await upsertUser("Admin", "admin@etiketi.local", "admin123", "ADMIN", "BROOKLIN");
  await upsertUser("Operador", "operador@etiketi.local", "operador123", "OPERATOR", "PINHEIROS");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
