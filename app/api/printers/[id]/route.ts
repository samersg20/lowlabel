import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const updateData: any = {};
  if (typeof body.unit === "string" && body.unit.trim()) updateData.unit = body.unit.trim().toUpperCase();
  if (typeof body.name === "string" && body.name.trim()) updateData.name = body.name.trim();
  if (typeof body.apiKey === "string" && body.apiKey.trim()) updateData.apiKey = body.apiKey.trim();
  if (body.printerId != null) {
    const parsed = Number(body.printerId);
    if (!Number.isInteger(parsed) || parsed <= 0) return NextResponse.json({ error: "printerId inválido" }, { status: 400 });
    updateData.printerId = parsed;
  }
  if (typeof body.isActive === "boolean") updateData.isActive = body.isActive;

  const updated = await prisma.printerConfig.updateMany({ where: { id: params.id, tenantId: session.user.tenantId }, data: updateData });
  if (!updated.count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const row = await prisma.printerConfig.findUnique({ where: { id: params.id }, select: { id: true, unit: true, name: true, printerId: true, isActive: true, createdAt: true } });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const deleted = await prisma.printerConfig.deleteMany({ where: { id: params.id, tenantId: session.user.tenantId } });
  if (!deleted.count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
