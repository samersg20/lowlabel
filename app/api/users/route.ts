import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { isStrongPassword } from "@/lib/tenant";
import { withTenantTx } from "@/lib/tenant-tx";
import { requireUnitForTenant } from "@/lib/unit-validation";

export async function GET(req: Request) {
  return withTenantTx(req, async ({ db, session }) => {
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const users = await db.user.findMany({
      select: { id: true, name: true, username: true, email: true, role: true, unit: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  });
}

export async function POST(req: Request) {
  return withTenantTx(req, async ({ db, tenantId, session }) => {
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const unit = String(body.unit || session.user.unit || "").trim().toUpperCase();

    if (!email || !password || !isStrongPassword(password)) {
      return NextResponse.json({ error: "Email e senha forte sÃ£o obrigatÃ³rios" }, { status: 400 });
    }
    if (!unit) {
      return NextResponse.json({ error: "Unidade Ã© obrigatÃ³ria" }, { status: 400 });
    }
    try {
      await requireUnitForTenant(db, unit);
    } catch {
      return NextResponse.json({ error: "Unidade invÃ¡lida" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await db.user.create({
      data: {
        tenantId,
        name: String(body.name || email).trim(),
        username: email,
        email,
        passwordHash,
        role: body.role || "OPERATOR",
        unit,
      },
      select: { id: true, name: true, username: true, email: true, role: true, unit: true, createdAt: true },
    });
    return NextResponse.json(created);
  });
}
