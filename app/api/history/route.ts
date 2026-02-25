import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const unit = searchParams.get("unit");

  const where: any = { tenantId: session.user.tenantId };
  if (q) where.item = { name: { contains: q, mode: "insensitive" } };
  if (unit && unit !== "TODAS") where.user = { unit };

  const records = await prisma.labelPrint.findMany({
    where,
    include: { item: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return NextResponse.json(records);
}
