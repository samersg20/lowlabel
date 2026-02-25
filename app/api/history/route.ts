import { auth } from "@/lib/auth";
import { getSaoPauloDayRange } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  const storageMethod = searchParams.get("storageMethod");
  const userId = searchParams.get("userId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const unit = searchParams.get("unit");

  const where: any = {};
  if (itemId) where.itemId = itemId;
  if (storageMethod) where.storageMethod = storageMethod;
  if (userId) where.userId = userId;
  if (unit && unit !== "TODAS") where.user = { unit };
  if (start || end) {
    where.createdAt = {};
    if (start) where.createdAt.gte = getSaoPauloDayRange(start).start;
    if (end) where.createdAt.lte = getSaoPauloDayRange(end).end;
  }

  const records = await prisma.labelPrint.findMany({
    where,
    include: { item: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(records);
}
