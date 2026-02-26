import { NextResponse } from "next/server";
import { withTenantTx } from "@/lib/tenant-tx";

export async function GET(req: Request) {
  return withTenantTx(req, async ({ db }) => {
    const rows = await db.unit.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(rows);
  });
}

export async function POST(req: Request) {
  return withTenantTx(req, async ({ db, tenantId, session }) => {
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body = await req.json();
    const name = String(body.name || "").trim().toUpperCase();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const managerName = String(body.managerName || "").trim();

    if (!name || !email || !phone || !managerName) return NextResponse.json({ error: "Dados obrigatÃ³rios" }, { status: 400 });

    const created = await db.unit.create({ data: { tenantId, name, email, phone, managerName } });
    return NextResponse.json(created);
  });
}
