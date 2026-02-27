import { NextResponse } from "next/server";
import { withTenantTx } from "@/lib/tenant-tx";

export async function GET(req: Request) {
  return withTenantTx(req, async ({ db, tenantId }) => {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const unit = searchParams.get("unit");

    const where: any = { tenantId };
    if (q) where.item = { name: { contains: q, mode: "insensitive" } };
    if (unit && unit !== "TODAS") {
      const unitRow = await db.unit.findFirst({ where: { name: unit } });
      if (!unitRow) return NextResponse.json({ error: "Unidade inválida" }, { status: 400 });
      where.user = { unit };
    }

    const records = await db.labelPrint.findMany({
      where,
      include: { item: true, user: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    return NextResponse.json(records);
  });
}



