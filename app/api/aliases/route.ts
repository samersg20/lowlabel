import { NextResponse } from "next/server";
import { withTenantTx } from "@/lib/tenant-tx";
import { normalizeText } from "@/lib/magic-text";

export async function GET(req: Request) {
  return withTenantTx(req, async ({ db, session }) => {
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const rows = await db.itemAlias.findMany({
      include: { item: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows);
  });
}

export async function POST(req: Request) {
  return withTenantTx(req, async ({ db, tenantId, session }) => {
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body = await req.json();
    const rawAlias = String(body.alias || "").trim();
    const alias = normalizeText(rawAlias);
    const itemId = String(body.itemId || "").trim();

    if (!alias || !itemId) return NextResponse.json({ error: "Alias e item são obrigatórios" }, { status: 400 });

    const item = await db.item.findFirst({ where: { id: itemId } });
    if (!item) return NextResponse.json({ error: "Item inválido" }, { status: 400 });

    try {
      const created = await db.itemAlias.create({
        data: {
          tenantId,
          alias,
          itemId: item.id,
        },
        include: { item: true },
      });
      return NextResponse.json(created, { status: 201 });
    } catch (error: any) {
      if (error?.code === "P2002") {
        return NextResponse.json({ error: "Alias já existe" }, { status: 409 });
      }
      throw error;
    }
  });
}



