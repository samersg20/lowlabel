import { tenantDb } from "@/lib/tenant-db";
import { requireTenantSession } from "@/lib/tenant";
import { NextResponse } from "next/server";

export async function GET() {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;

  const db = tenantDb(scoped.tenantId);
  const rows = await db.unit.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  if (scoped.session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const name = String(body.name || "").trim().toUpperCase();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const managerName = String(body.managerName || "").trim();

  if (!name || !email || !phone || !managerName) return NextResponse.json({ error: "Dados obrigatórios" }, { status: 400 });

  const db = tenantDb(scoped.tenantId);
  const created = await db.unit.create({ data: { tenantId: scoped.tenantId, name, email, phone, managerName } });
  return NextResponse.json(created);
}
