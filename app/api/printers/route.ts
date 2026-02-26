import { NextResponse } from "next/server";
import { withTenantTx } from "@/lib/tenant-tx";
import { requireUnitForTenant } from "@/lib/unit-validation";

export async function GET(req: Request) {
  return withTenantTx(req, async ({ db }) => {
    const rows = await db.printerConfig.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, unit: true, name: true, printerId: true, isActive: true, createdAt: true },
    });
    return NextResponse.json(rows);
  });
}

export async function POST(req: Request) {
  return withTenantTx(req, async ({ db, tenantId, session }) => {
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body = await req.json();
    const unit = String(body.unit ?? "").trim().toUpperCase();
    const name = String(body.name ?? "").trim();
    const apiKey = String(body.apiKey ?? "").trim();
    const printerId = Number(body.printerId);

    if (!unit || !name || !apiKey || !Number.isInteger(printerId) || printerId <= 0) {
      return NextResponse.json({ error: "Dados invÃ¡lidos" }, { status: 400 });
    }

    try {
      await requireUnitForTenant(db, unit);
    } catch {
      return NextResponse.json({ error: "Unidade invÃ¡lida" }, { status: 400 });
    }

    const tenant = await db.tenant.findFirst({ where: { id: tenantId } });
    const currentCount = await db.printerConfig.count();
    if (tenant && currentCount >= tenant.printerLimit) {
      return NextResponse.json({ error: `Limite de impressoras atingido no plano (${tenant.printerLimit})` }, { status: 400 });
    }

    const created = await db.printerConfig.create({
      data: {
        tenantId,
        unit,
        name,
        apiKey,
        printerId,
        isActive: body.isActive !== false,
        userId: session.user.id,
      },
      select: { id: true, unit: true, name: true, printerId: true, isActive: true, createdAt: true },
    });

    return NextResponse.json(created);
  });
}
