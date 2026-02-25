import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const updated = await prisma.itemGroup.updateMany({ where: { id: params.id, tenantId: session.user.tenantId }, data: { name: String(body.name || "").trim().toUpperCase() } });
  if (!updated.count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const row = await prisma.itemGroup.findUnique({ where: { id: params.id } });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const deleted = await prisma.itemGroup.deleteMany({ where: { id: params.id, tenantId: session.user.tenantId } });
  if (!deleted.count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
