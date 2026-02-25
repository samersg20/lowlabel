import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireTenantSession, isStrongPassword } from "@/lib/tenant";

export async function GET() {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  if (scoped.session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    where: { tenantId: scoped.tenantId },
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

  if (!email || !password || !isStrongPassword(password)) {
    return NextResponse.json({ error: "Email e senha forte são obrigatórios" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await prisma.user.create({
    data: {
      tenantId: scoped.tenantId,
      name: String(body.name || email).trim(),
      username: email,
      email,
      passwordHash,
      role: body.role || "OPERATOR",
      unit: body.unit || scoped.session.user.unit || "MATRIZ",
    },
    select: { id: true, name: true, username: true, email: true, role: true, unit: true, createdAt: true },
  });
  return NextResponse.json(created);
}
