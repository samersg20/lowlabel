import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();

  const updated = await prisma.method.updateMany({
    where: { id: Number(params.id), tenantId: session.user.tenantId },
    data: { name: String(body.name || "").trim().toUpperCase(), durationValue: Number(body.durationValue), durationUnit: String(body.durationUnit || "").trim() },
  });

  if (!updated.count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const row = await prisma.method.findUnique({ where: { id: Number(params.id) } });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const deleted = await prisma.method.deleteMany({ where: { id: Number(params.id), tenantId: session.user.tenantId } });
  if (!deleted.count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
