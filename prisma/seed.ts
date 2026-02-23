import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(name: string, email: string, password: string, role: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role },
    create: { name, email, passwordHash, role },
  });
}

async function main() {
  await upsertUser("Admin", "admin@safelabel.local", "admin123", "ADMIN");
  await upsertUser("Operador", "operador@safelabel.local", "operador123", "OPERATOR");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
