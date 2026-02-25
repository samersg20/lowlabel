import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function maskApiKey(value: string) {
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rows = await prisma.printerConfig.findMany({
    orderBy: [{ unit: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(rows.map((r) => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    printerId: r.printerId,
    isActive: r.isActive,
    apiKeyMasked: maskApiKey(r.apiKey),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  })));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const unit = String(body.unit ?? "").trim();
  const name = String(body.name ?? "").trim();
  const apiKey = String(body.apiKey ?? "").trim();
  const printerId = Number(body.printerId);

  if (!unit || !name || !apiKey || !Number.isInteger(printerId) || printerId <= 0) {
    return NextResponse.json({ error: "Dados inválidos para cadastro da impressora" }, { status: 400 });
  }

  const created = await prisma.printerConfig.create({
    data: {
      name,
      unit,
      apiKey,
      printerId,
      isActive: body.isActive !== false,
      userId: session.user.id,
    },
  });

  return NextResponse.json({
    id: created.id,
    name: created.name,
    unit: created.unit,
    printerId: created.printerId,
    isActive: created.isActive,
    apiKeyMasked: maskApiKey(created.apiKey),
  });
}
