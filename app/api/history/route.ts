import { tenantDb } from "@/lib/tenant-db";
import { requireTenantSession } from "@/lib/tenant";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const unit = searchParams.get("unit");

  const where: any = { tenantId: scoped.tenantId };
  if (q) where.item = { name: { contains: q, mode: "insensitive" } };
  if (unit && unit !== "TODAS") where.user = { unit };

  const db = tenantDb(scoped.tenantId);
  const records = await db.labelPrint.findMany({
    where,
    include: { item: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return NextResponse.json(records);
}
