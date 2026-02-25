import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim().toUpperCase() : undefined;
  const durationValue = body.durationValue == null ? undefined : Number(body.durationValue);
  const durationUnit = body.durationUnit === "hours" || body.durationUnit === "days" ? body.durationUnit : undefined;
  if (durationValue != null && (!Number.isInteger(durationValue) || durationValue < 1)) {
    return NextResponse.json({ error: "Tempo inválido" }, { status: 400 });
  }
  const updated = await prisma.method.update({ where: { id: Number(params.id) }, data: { name, durationValue, durationUnit } });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await prisma.method.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ ok: true });
}
