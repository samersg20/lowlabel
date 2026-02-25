import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await prisma.printerConfig.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
    select: { id: true, unit: true, name: true, printerId: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const unit = String(body.unit ?? "").trim().toUpperCase();
  const name = String(body.name ?? "").trim();
  const apiKey = String(body.apiKey ?? "").trim();
  const printerId = Number(body.printerId);

  if (!unit || !name || !apiKey || !Number.isInteger(printerId) || printerId <= 0) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId || "" } });
  const currentCount = await prisma.printerConfig.count({ where: { tenantId: session.user.tenantId } });
  if (tenant && currentCount >= tenant.printerLimit) {
    return NextResponse.json({ error: `Limite de impressoras atingido no plano (${tenant.printerLimit})` }, { status: 400 });
  }

  const created = await prisma.printerConfig.create({
    data: {
      tenantId: session.user.tenantId,
      unit,
      name,
      apiKey,
      printerId,
      isActive: body.isActive !== false,
      userId: session.user.id,
    },
    select: { id: true, unit: true, name: true, printerId: true, isActive: true, createdAt: true },
  });

  return NextResponse.json(created);
}
