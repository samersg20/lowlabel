import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await prisma.method.findMany({ where: { tenantId: session.user.tenantId }, orderBy: { id: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();

  const name = String(body.name || "").trim().toUpperCase();
  const durationValue = Number(body.durationValue);
  const durationUnit = String(body.durationUnit || "").trim();

  const created = await prisma.method.create({ data: { tenantId: session.user.tenantId, name, durationValue, durationUnit } });
  return NextResponse.json(created);
}
