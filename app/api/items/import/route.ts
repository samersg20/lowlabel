import { auth } from "@/lib/auth";
import { generateUniqueItemCode } from "@/lib/item-code";
import { prisma } from "@/lib/prisma";
import { parseItemsWorkbook } from "@/lib/xlsx";
import { NextResponse } from "next/server";

function parseFlag(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["s", "sim", "1", "true", "yes", "y"].includes(normalized)) return true;
  if (["n", "nao", "não", "0", "false", "no", ""].includes(normalized)) return false;
  throw new Error("Valor de método inválido");
}

function parsePreferredMethod(value: string, sheetLine: number, methodsById: Map<string, string>) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  const method = methodsById.get(normalized);
  if (!method) {
    throw new Error(`Linha ${sheetLine}: Método Principal inválido (${normalized}). Use o número do módulo Métodos`);
  }
  return method;
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

    const groups = await prisma.itemGroup.findMany({ where: { tenantId: session.user.tenantId } });
    const groupByName = new Map(groups.map((g) => [g.name.trim().toLowerCase(), g]));
    const methods = await prisma.method.findMany({ where: { tenantId: session.user.tenantId }, orderBy: { id: "asc" } });
    const methodsById = new Map(methods.map((m) => [String(m.id), m.name]));

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
        preferredStorageMethod: parsePreferredMethod(row.preferredStorageMethod, sheetLine, methodsById),
      };

      const preferredEnabledMap: Record<string, boolean> = {
        QUENTE: data.methodQuente,
        "PISTA FRIA": data.methodPistaFria,
        DESCONGELANDO: data.methodDescongelando,
        RESFRIADO: data.methodResfriado,
        CONGELADO: data.methodCongelado,
        "AMBIENTE": data.methodAmbienteSecos,
      };

      if (data.preferredStorageMethod && !preferredEnabledMap[data.preferredStorageMethod]) {
        throw new Error(`Linha ${sheetLine}: Método Principal deve estar marcado com S`);
      }

      const existing = await prisma.item.findFirst({ where: { tenantId: session.user.tenantId, name: data.name, groupId: data.groupId } });

      if (existing) {
        await prisma.item.update({ where: { id: existing.id }, data: { ...data } });
        updated += 1;
      } else {
        await prisma.item.create({ data: { ...data, tenantId: session.user.tenantId, type: "GERAL", itemCode: await generateUniqueItemCode() } });
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
