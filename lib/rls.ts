import { prisma } from "@/lib/prisma";

export async function withTenantRls<T>(tenantId: string, fn: (tx: any) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}

export async function withRlsBypass<T>(fn: (tx: any) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.bypass_rls', '1', true)`;
    return fn(tx);
  });
}
