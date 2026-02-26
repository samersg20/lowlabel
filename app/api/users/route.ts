import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireTenantSession, isStrongPassword } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { requireUnitForTenant } from "@/lib/unit-validation";

export async function GET() {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  if (scoped.session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = tenantDb(scoped.tenantId);
  const users = await db.user.findMany({
    select: { id: true, name: true, username: true, email: true, role: true, unit: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  if (scoped.session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const unit = String(body.unit || scoped.session.user.unit || "").trim().toUpperCase();

  if (!email || !password || !isStrongPassword(password)) {
    return NextResponse.json({ error: "Email e senha forte são obrigatórios" }, { status: 400 });
  }

  if (!unit) {
    return NextResponse.json({ error: "Unidade Ã© obrigatÃ³ria" }, { status: 400 });
  }
  try {
    await requireUnitForTenant(scoped.tenantId, unit);
  } catch {
    return NextResponse.json({ error: "Unidade invÃ¡lida" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const db = tenantDb(scoped.tenantId);
  const created = await db.user.create({
    data: {
      tenantId: scoped.tenantId,
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
}
