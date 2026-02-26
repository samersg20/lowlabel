import { tenantDb } from "@/lib/tenant-db";
import { requireTenantSession } from "@/lib/tenant";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  if (scoped.session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const db = tenantDb(scoped.tenantId);
  const updated = await db.unit.updateMany({
    where: { id: params.id },
    data: {
      name: String(body.name || "").trim().toUpperCase(),
      email: String(body.email || "").trim(),
      phone: String(body.phone || "").trim(),
      managerName: String(body.managerName || "").trim(),
    },
  });

  if (!updated.count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const row = await db.unit.findFirst({ where: { id: params.id } });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  if (scoped.session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = tenantDb(scoped.tenantId);
  const deleted = await db.unit.deleteMany({ where: { id: params.id } });
  if (!deleted.count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
