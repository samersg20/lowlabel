import { tenantDb } from "@/lib/tenant-db";
import { requireTenantSession } from "@/lib/tenant";
import { requireUnitForTenant } from "@/lib/unit-validation";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  if (scoped.session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const unit = typeof body.unit === "string" ? body.unit.trim().toUpperCase() : undefined;
  if (unit) {
    try {
      await requireUnitForTenant(scoped.tenantId, unit);
    } catch {
      return NextResponse.json({ error: "Unidade invÃ¡lida" }, { status: 400 });
    }
  }
  const data: any = {
    name: body.name,
    email: body.email,
    username: body.email,
    role: body.role,
    ...(unit ? { unit } : {}),
  };
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);

  const db = tenantDb(scoped.tenantId);
  const updated = await db.user.updateMany({ where: { id: params.id }, data });

  if (!updated.count) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const row = await db.user.findFirst({ where: { id: params.id }, select: { id: true, name: true, username: true, email: true, role: true, unit: true } });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  if (scoped.session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = tenantDb(scoped.tenantId);
  const deleted = await db.user.deleteMany({ where: { id: params.id } });
  if (!deleted.count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
