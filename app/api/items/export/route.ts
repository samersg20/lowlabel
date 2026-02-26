import { tenantDb } from "@/lib/tenant-db";
import { requireTenantSession } from "@/lib/tenant";
import { buildItemsWorkbook } from "@/lib/xlsx";
import { NextResponse } from "next/server";

export async function GET() {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  if (scoped.session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = tenantDb(scoped.tenantId);
  const methods = await db.method.findMany({ orderBy: { id: "asc" } });
  const methodCode = new Map(methods.map((m) => [m.name, String(m.id)]));

  const items = await db.item.findMany({ include: { group: true }, orderBy: { name: "asc" } });
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
    preferredStorageMethod: item.preferredStorageMethod ? methodCode.get(item.preferredStorageMethod) || "" : "",
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
