import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(name: string, email: string, password: string, role: string, unit: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role, unit },
    create: { name, email, passwordHash, role, unit },
  });
}

async function main() {
  await prisma.itemGroup.upsert({ where: { name: "Carnes" }, update: {}, create: { name: "Carnes" } });
  await prisma.itemGroup.upsert({ where: { name: "Molhos" }, update: {}, create: { name: "Molhos" } });

  await upsertUser("Admin", "admin@safelabel.local", "admin123", "ADMIN", "BROOKLIN");
  await upsertUser("Operador", "operador@safelabel.local", "operador123", "OPERATOR", "PINHEIROS");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
