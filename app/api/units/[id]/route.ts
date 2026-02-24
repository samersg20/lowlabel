import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const updated = await prisma.unit.update({
    where: { id: params.id },
    data: {
      name: typeof body.name === "string" ? body.name.trim().toUpperCase() : undefined,
      email: typeof body.email === "string" ? body.email.trim() : undefined,
      phone: typeof body.phone === "string" ? body.phone.trim() : undefined,
      managerName: typeof body.managerName === "string" ? body.managerName.trim() : undefined,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await prisma.unit.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
