import { auth } from "@/lib/auth";
import { generateUniqueItemCode } from "@/lib/item-code";
import { prisma } from "@/lib/prisma";
import { parseItemsWorkbook } from "@/lib/xlsx";
import { NextResponse } from "next/server";

function parseFlag(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["1", "true", "sim", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "nao", "não", "no", "n", ""].includes(normalized)) return false;
  throw new Error("Valor de método inválido");
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo .xlsx é obrigatório" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseItemsWorkbook(buffer);

    const groups = await prisma.itemGroup.findMany();
    const groupByName = new Map(groups.map((g) => [g.name.trim().toLowerCase(), g]));

    let created = 0;
    let updated = 0;

    for (const [idx, row] of rows.entries()) {
      if (!row.name || !row.group) {
        throw new Error(`Linha ${idx + 2}: nome e grupo são obrigatórios`);
      }
      const group = groupByName.get(row.group.trim().toLowerCase());
      if (!group) throw new Error(`Linha ${idx + 2}: grupo não encontrado (${row.group})`);

      const data = {
        name: row.name.trim(),
        groupId: group.id,
        sif: row.sif?.trim() || null,
        methodQuente: parseFlag(row.methodQuente),
        methodPistaFria: parseFlag(row.methodPistaFria),
        methodDescongelando: parseFlag(row.methodDescongelando),
        methodResfriado: parseFlag(row.methodResfriado),
        methodCongelado: parseFlag(row.methodCongelado),
        methodAmbienteSecos: parseFlag(row.methodAmbienteSecos),
      };

      let existing = null;
      if (/^\d{6}$/.test(row.itemCode || "")) {
        existing = await prisma.item.findUnique({ where: { itemCode: row.itemCode } });
      }
      if (!existing) {
        existing = await prisma.item.findFirst({ where: { name: data.name, groupId: data.groupId } });
      }

      if (existing) {
        await prisma.item.update({ where: { id: existing.id }, data: { ...data } });
        updated += 1;
      } else {
        await prisma.item.create({ data: { ...data, type: "GERAL", itemCode: await generateUniqueItemCode() } });
        created += 1;
      }
    }

    return NextResponse.json({ ok: true, message: "OK, importado", created, updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro de importação, verifique o arquivo" }, { status: 400 });
  }
}
