import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await prisma.method.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const name = String(body.name || "").trim().toUpperCase();
  const durationValue = Number(body.durationValue);
  const durationUnit = body.durationUnit === "hours" ? "hours" : "days";
  if (!name || !Number.isInteger(durationValue) || durationValue < 1) {
    return NextResponse.json({ error: "Nome e tempo válidos são obrigatórios" }, { status: 400 });
  }
  const created = await prisma.method.create({ data: { name, durationValue, durationUnit } });
  return NextResponse.json(created, { status: 201 });
}
