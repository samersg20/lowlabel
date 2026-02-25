import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function maskApiKey(value: string) {
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const updateData: any = {};

  if (typeof body.name === "string" && body.name.trim()) updateData.name = body.name.trim();
  if (typeof body.unit === "string" && body.unit.trim()) updateData.unit = body.unit.trim();
  if (body.printerId !== undefined) {
    const printerId = Number(body.printerId);
    if (!Number.isInteger(printerId) || printerId <= 0) {
      return NextResponse.json({ error: "printerId inválido" }, { status: 400 });
    }
    updateData.printerId = printerId;
  }
  if (typeof body.apiKey === "string" && body.apiKey.trim()) updateData.apiKey = body.apiKey.trim();
  if (typeof body.isActive === "boolean") updateData.isActive = body.isActive;

  const updated = await prisma.printerConfig.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    unit: updated.unit,
    printerId: updated.printerId,
    isActive: updated.isActive,
    apiKeyMasked: maskApiKey(updated.apiKey),
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.printerConfig.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
