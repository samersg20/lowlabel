import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const data: any = {
    name: body.name,
    email: body.email,
    username: body.email,
    role: body.role,
    unit: body.unit,
  };
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);

  const updated = await prisma.user.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data,
  });

  if (!updated.count) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const row = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, name: true, username: true, email: true, role: true, unit: true } });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const deleted = await prisma.user.deleteMany({ where: { id: params.id, tenantId: session.user.tenantId } });
  if (!deleted.count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
