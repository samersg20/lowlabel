import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await prisma.unit.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const name = String(body.name || "").trim().toUpperCase();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const managerName = String(body.managerName || "").trim();
  if (!name || !email || !phone || !managerName) return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 });
  const created = await prisma.unit.create({ data: { name, email, phone, managerName } });
  return NextResponse.json(created, { status: 201 });
}
