import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(name: string, username: string, email: string, password: string, role: string, unit: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { name, username, passwordHash, role, unit },
    create: { name, username, email, passwordHash, role, unit },
  });
}

async function main() {
  await prisma.unit.upsert({ where: { name: "BROOKLIN" }, update: {}, create: { name: "BROOKLIN", email: "brooklin@low.local", phone: "", managerName: "" } });
  await prisma.unit.upsert({ where: { name: "PINHEIROS" }, update: {}, create: { name: "PINHEIROS", email: "pinheiros@low.local", phone: "", managerName: "" } });

  const methods = [
    { name: "QUENTE", durationValue: 3, durationUnit: "hours" },
    { name: "PISTA FRIA", durationValue: 3, durationUnit: "hours" },
    { name: "DESCONGELANDO", durationValue: 3, durationUnit: "days" },
    { name: "RESFRIADO", durationValue: 3, durationUnit: "days" },
    { name: "CONGELADO", durationValue: 30, durationUnit: "days" },
    { name: "AMBIENTE SECOS", durationValue: 30, durationUnit: "days" },
  ];
  for (const method of methods) {
    await prisma.method.upsert({ where: { name: method.name }, update: method, create: method });
  }

  await prisma.itemGroup.upsert({ where: { name: "Carnes" }, update: {}, create: { name: "Carnes" } });
  await prisma.itemGroup.upsert({ where: { name: "Molhos" }, update: {}, create: { name: "Molhos" } });

  await upsertUser("Admin", "admin", "admin@safelabel.local", "admin123", "ADMIN", "BROOKLIN");
  await upsertUser("Operador", "operador", "operador@safelabel.local", "operador123", "OPERATOR", "PINHEIROS");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
