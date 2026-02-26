import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function getConnectionString() {
  const cs = process.env.DATABASE_URL ?? process.env.DIRECT_DATABASE_URL;
  if (!cs) throw new Error("Missing DATABASE_URL (or DIRECT_DATABASE_URL) in env");
  return cs;
}

const adapter = new PrismaPg({ connectionString: getConnectionString() });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;