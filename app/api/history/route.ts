import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  const storageMethod = searchParams.get("storageMethod");
  const userId = searchParams.get("userId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const where: any = {};
  if (itemId) where.itemId = itemId;
  if (storageMethod) where.storageMethod = storageMethod;
  if (userId) where.userId = userId;
  if (start || end) {
    where.createdAt = {};
    if (start) where.createdAt.gte = new Date(`${start}T00:00:00`);
    if (end) where.createdAt.lte = new Date(`${end}T23:59:59`);
  }

  const records = await prisma.labelPrint.findMany({
    where,
    include: { item: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(records);
}
