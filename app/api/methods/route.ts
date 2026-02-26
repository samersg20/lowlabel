import { tenantDb } from "@/lib/tenant-db";
import { requireTenantSession } from "@/lib/tenant";
import { NextResponse } from "next/server";

export async function GET() {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  const db = tenantDb(scoped.tenantId);
  const rows = await db.method.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  if (scoped.session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();

  const name = String(body.name || "").trim().toUpperCase();
  const durationValue = Number(body.durationValue);
  const durationUnit = String(body.durationUnit || "").trim();

  const db = tenantDb(scoped.tenantId);
  const created = await db.method.create({ data: { tenantId: scoped.tenantId, name, durationValue, durationUnit } });
  return NextResponse.json(created);
}
