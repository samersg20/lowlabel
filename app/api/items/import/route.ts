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

function validateName(name: string, sheetLine: number) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error(`Linha ${sheetLine}: nome e grupo são obrigatórios`);
  if (!/[A-Za-zÀ-ÿ]/.test(trimmed)) {
    throw new Error(`Linha ${sheetLine}: nome inválido (${trimmed}). Informe um nome de produto`);
  }
  return trimmed;
}

function validateSif(sif: string | undefined, sheetLine: number) {
  const trimmed = String(sif || "").trim();
  if (!trimmed) return null;
  if (!/^\d{1,20}$/.test(trimmed)) {
    throw new Error(`Linha ${sheetLine}: SIF inválido (${trimmed}). Use apenas números`);
  }
  return trimmed;
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

    const nonEmptyRows = rows
      .map((row, idx) => ({ row, sheetLine: idx + 2 }))
      .filter(({ row }) => Object.values(row).some((value) => String(value || "").trim() !== ""));

    const groups = await prisma.itemGroup.findMany();
    const groupByName = new Map(groups.map((g) => [g.name.trim().toLowerCase(), g]));

    let created = 0;
    let updated = 0;

    for (const { row, sheetLine } of nonEmptyRows) {
      if (!row.name || !row.group) {
        throw new Error(`Linha ${sheetLine}: nome e grupo são obrigatórios`);
      }

      const group = groupByName.get(row.group.trim().toLowerCase());
      if (!group) throw new Error(`Linha ${sheetLine}: grupo não encontrado (${row.group})`);

      const data = {
        name: validateName(row.name, sheetLine),
        groupId: group.id,
        sif: validateSif(row.sif, sheetLine),
        methodQuente: parseFlag(row.methodQuente),
        methodPistaFria: parseFlag(row.methodPistaFria),
        methodDescongelando: parseFlag(row.methodDescongelando),
        methodResfriado: parseFlag(row.methodResfriado),
        methodCongelado: parseFlag(row.methodCongelado),
        methodAmbienteSecos: parseFlag(row.methodAmbienteSecos),
      };

      const existing = await prisma.item.findFirst({ where: { name: data.name, groupId: data.groupId } });

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
    const message = error instanceof Error ? error.message : "Erro de importação, verifique o arquivo";
    const detailed =
      message.startsWith("Linha") ||
      message.startsWith("Cabeçalhos") ||
      message.includes("Planilha inválida") ||
      message.includes("Arquivo XLSX inválido") ||
      message.includes("Compressão XLSX não suportada");

    return NextResponse.json({ error: detailed ? message : "Erro de importação, verifique o arquivo" }, { status: 400 });
  }
}
