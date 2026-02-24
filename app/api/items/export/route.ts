import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildItemsWorkbook } from "@/lib/xlsx";
import { NextResponse } from "next/server";

const methodCode: Record<string, string> = {
  QUENTE: "1",
  "PISTA FRIA": "2",
  DESCONGELANDO: "3",
  RESFRIADO: "4",
  CONGELADO: "5",
  "AMBIENTE SECOS": "6",
};

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const items = await prisma.item.findMany({ include: { group: true }, orderBy: { name: "asc" } });
  const rows = items.map((item) => ({
    name: item.name,
    group: item.group?.name || "",
    sif: item.sif || "",
    methodQuente: item.methodQuente ? "S" : "N",
    methodPistaFria: item.methodPistaFria ? "S" : "N",
    methodDescongelando: item.methodDescongelando ? "S" : "N",
    methodResfriado: item.methodResfriado ? "S" : "N",
    methodCongelado: item.methodCongelado ? "S" : "N",
    methodAmbienteSecos: item.methodAmbienteSecos ? "S" : "N",
    preferredStorageMethod: item.preferredStorageMethod ? methodCode[item.preferredStorageMethod] || "" : "",
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
