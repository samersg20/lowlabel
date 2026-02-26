import { tenantDb } from "@/lib/tenant-db";
import { requireTenantSession } from "@/lib/tenant";
import { requireUnitForTenant } from "@/lib/unit-validation";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  if (scoped.session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const updateData: any = {};
  if (typeof body.unit === "string" && body.unit.trim()) {
    const unit = body.unit.trim().toUpperCase();
    try {
      await requireUnitForTenant(scoped.tenantId, unit);
    } catch {
      return NextResponse.json({ error: "Unidade invÃ¡lida" }, { status: 400 });
    }
    updateData.unit = unit;
  }
  if (typeof body.name === "string" && body.name.trim()) updateData.name = body.name.trim();
  if (typeof body.apiKey === "string" && body.apiKey.trim()) updateData.apiKey = body.apiKey.trim();
  if (body.printerId != null) {
    const parsed = Number(body.printerId);
    if (!Number.isInteger(parsed) || parsed <= 0) return NextResponse.json({ error: "printerId inválido" }, { status: 400 });
    updateData.printerId = parsed;
  }
  if (typeof body.isActive === "boolean") updateData.isActive = body.isActive;

  const db = tenantDb(scoped.tenantId);
  const updated = await db.printerConfig.updateMany({ where: { id: params.id }, data: updateData });
  if (!updated.count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const row = await db.printerConfig.findFirst({ where: { id: params.id }, select: { id: true, unit: true, name: true, printerId: true, isActive: true, createdAt: true } });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  if (scoped.session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = tenantDb(scoped.tenantId);
  const deleted = await db.printerConfig.deleteMany({ where: { id: params.id } });
  if (!deleted.count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
