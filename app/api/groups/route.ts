import { tenantDb } from "@/lib/tenant-db";
import { requireTenantSession } from "@/lib/tenant";
import { NextResponse } from "next/server";

export async function GET() {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  const db = tenantDb(scoped.tenantId);
  const groups = await db.itemGroup.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(groups);
}

export async function POST(req: Request) {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  if (scoped.session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const db = tenantDb(scoped.tenantId);
  const created = await db.itemGroup.create({ data: { tenantId: scoped.tenantId, name: String(body.name || "").trim().toUpperCase() } });
  return NextResponse.json(created);
}
