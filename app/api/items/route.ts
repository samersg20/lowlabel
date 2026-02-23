import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const items = await prisma.item.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const created = await prisma.item.create({
    data: {
      name: body.name,
      type: body.type,
      sif: body.sif || null,
      notes: body.notes || null,
      chilledHours: body.chilledHours,
      frozenHours: body.frozenHours,
      ambientHours: body.ambientHours,
      hotHours: body.hotHours,
      thawingHours: body.thawingHours,
    },
  });
  return NextResponse.json(created);
}
