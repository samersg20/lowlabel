import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await prisma.unit.findMany({ where: { tenantId: session.user.tenantId }, orderBy: { name: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const name = String(body.name || "").trim().toUpperCase();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const managerName = String(body.managerName || "").trim();

  if (!name || !email || !phone || !managerName) return NextResponse.json({ error: "Dados obrigatórios" }, { status: 400 });

  const created = await prisma.unit.create({ data: { tenantId: session.user.tenantId, name, email, phone, managerName } });
  return NextResponse.json(created);
}
