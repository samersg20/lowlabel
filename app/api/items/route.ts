import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  const items = await prisma.item.findMany({
    where: groupId ? { groupId } : undefined,
    include: { group: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const created = await prisma.item.create({
    data: {
      name: body.name,
      type: "GERAL",
      groupId: body.groupId || null,
      sif: body.sif || null,
      notes: body.notes || null,
      chilledHours: body.chilledHours,
      frozenHours: body.frozenHours,
      ambientHours: body.ambientHours,
      hotHours: body.hotHours,
      thawingHours: body.thawingHours,
      methodQuente: Boolean(body.methodQuente),
      methodPistaFria: Boolean(body.methodPistaFria),
      methodDescongelando: Boolean(body.methodDescongelando),
      methodResfriado: Boolean(body.methodResfriado),
      methodCongelado: Boolean(body.methodCongelado),
      methodAmbienteSecos: Boolean(body.methodAmbienteSecos),
    },
    include: { group: true },
  });
  return NextResponse.json(created);
}
