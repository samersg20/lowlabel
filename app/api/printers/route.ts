import { tenantDb } from "@/lib/tenant-db";
import { requireTenantSession } from "@/lib/tenant";
import { requireUnitForTenant } from "@/lib/unit-validation";
import { NextResponse } from "next/server";

export async function GET() {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;

  const db = tenantDb(scoped.tenantId);
  const rows = await db.printerConfig.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, unit: true, name: true, printerId: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  if (scoped.session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const unit = String(body.unit ?? "").trim().toUpperCase();
  const name = String(body.name ?? "").trim();
  const apiKey = String(body.apiKey ?? "").trim();
  const printerId = Number(body.printerId);

  if (!unit || !name || !apiKey || !Number.isInteger(printerId) || printerId <= 0) {
    return NextResponse.json({ error: "Dados invÃ¡lidos" }, { status: 400 });
  }

  const db = tenantDb(scoped.tenantId);
  try {
    await requireUnitForTenant(scoped.tenantId, unit);
  } catch {
    return NextResponse.json({ error: "Unidade invÃ¡lida" }, { status: 400 });
  }

  const tenant = await db.tenant.findFirst({ where: { id: scoped.tenantId } });
  const currentCount = await db.printerConfig.count();
  if (tenant && currentCount >= tenant.printerLimit) {
    return NextResponse.json({ error: `Limite de impressoras atingido no plano (${tenant.printerLimit})` }, { status: 400 });
  }

  const created = await db.printerConfig.create({
    data: {
      tenantId: scoped.tenantId,
      unit,
      name,
      apiKey,
      printerId,
      isActive: body.isActive !== false,
      userId: scoped.session.user.id,
    },
    select: { id: true, unit: true, name: true, printerId: true, isActive: true, createdAt: true },
  });

  return NextResponse.json(created);
}
