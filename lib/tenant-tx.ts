import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";
import { tenantDbFromTx } from "@/lib/tenant-db";
import type { NextResponse } from "next/server";

export async function withTenantTx<T>(
  req: Request,
  fn: (ctx: { tx: any; db: any; tenantId: string; session: any }) => Promise<T>,
): Promise<T | NextResponse> {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error as NextResponse;

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.tenant_id', ${scoped.tenantId}, true)`;
    const db = tenantDbFromTx(tx, scoped.tenantId);
    return fn({ tx, db, tenantId: scoped.tenantId, session: scoped.session });
  });
}

export async function withTenantIdTx<T>(
  tenantId: string,
  fn: (ctx: { tx: any; db: any; tenantId: string }) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.tenant_id', ${tenantId}, true)`;
    const db = tenantDbFromTx(tx, tenantId);
    return fn({ tx, db, tenantId });
  });
}

export async function withRlsBypassTx<T>(
  fn: (ctx: { tx: any }) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.bypass_rls', '1', true)`;
    return fn({ tx });
  });
}
