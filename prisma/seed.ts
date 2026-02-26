import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(tenantId: string, name: string, email: string, password: string, role: string, unit: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { tenantId, name, username: email, email, passwordHash, role, unit },
    });
    return;
  }

  await prisma.user.create({ data: { tenantId, name, username: email, email, passwordHash, role, unit } });
}

async function upsertUnit(tenantId: string, name: string, email: string) {
  await prisma.unit.upsert({
    where: { tenantId_name: { tenantId, name } },
    update: { email },
    create: { tenantId, name, email, phone: "", managerName: "" },
  });
}

async function upsertMethod(tenantId: string, method: { name: string; durationValue: number; durationUnit: string }) {
  await prisma.method.upsert({
    where: { tenantId_name: { tenantId, name: method.name } },
    update: method,
    create: { ...method, tenantId },
  });
}

async function upsertGroup(tenantId: string, name: string) {
  await prisma.itemGroup.upsert({
    where: { tenantId_name: { tenantId, name } },
    update: {},
    create: { tenantId, name },
  });
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { cnpj: "00000000000000" },
    update: {
      companyName: "Etiketi Demo",
      legalName: "Etiketi Demo Ltda",
      tradeName: "Etiketi Demo",
      businessAddress: "Rua Demo, 123",
      neighborhood: "CENTRO",
      city: "Sao Paulo",
      state: "SP",
      zipCode: "01000-000",
      stateRegistration: "ISENTO",
    },
    create: {
      companyName: "Etiketi Demo",
      legalName: "Etiketi Demo Ltda",
      tradeName: "Etiketi Demo",
      cnpj: "00000000000000",
      businessAddress: "Rua Demo, 123",
      neighborhood: "CENTRO",
      city: "Sao Paulo",
      state: "SP",
      zipCode: "01000-000",
      stateRegistration: "ISENTO",
      printerLimit: 2,
      subscriptionStatus: "active",
    },
  });

  await upsertUnit(tenant.id, "BROOKLIN", "brooklin@low.local");
  await upsertUnit(tenant.id, "PINHEIROS", "pinheiros@low.local");

  const methods = [
    { name: "QUENTE", durationValue: 3, durationUnit: "hours" },
    { name: "PISTA FRIA", durationValue: 3, durationUnit: "hours" },
    { name: "DESCONGELANDO", durationValue: 3, durationUnit: "days" },
    { name: "RESFRIADO", durationValue: 3, durationUnit: "days" },
    { name: "CONGELADO", durationValue: 30, durationUnit: "days" },
    { name: "AMBIENTE", durationValue: 30, durationUnit: "days" },
  ];

  for (const method of methods) await upsertMethod(tenant.id, method);

  await upsertGroup(tenant.id, "Carnes");
  await upsertGroup(tenant.id, "Molhos");

  await upsertUser(tenant.id, "Admin", "admin@etiketi.local", "admin123", "ADMIN", "BROOKLIN");
  await upsertUser(tenant.id, "Operador", "operador@etiketi.local", "operador123", "OPERATOR", "PINHEIROS");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
