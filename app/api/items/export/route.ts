import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildItemsWorkbook } from "@/lib/xlsx";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const items = await prisma.item.findMany({ include: { group: true }, orderBy: { name: "asc" } });
  const rows = items.map((item) => ({
    itemCode: item.itemCode,
    name: item.name,
    group: item.group?.name || "",
    sif: item.sif || "",
    methodQuente: item.methodQuente ? "1" : "0",
    methodPistaFria: item.methodPistaFria ? "1" : "0",
    methodDescongelando: item.methodDescongelando ? "1" : "0",
    methodResfriado: item.methodResfriado ? "1" : "0",
    methodCongelado: item.methodCongelado ? "1" : "0",
    methodAmbienteSecos: item.methodAmbienteSecos ? "1" : "0",
  }));

  const buffer = buildItemsWorkbook(rows);
  const timestamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="itens-${timestamp}.xlsx"`,
    },
  });
}
