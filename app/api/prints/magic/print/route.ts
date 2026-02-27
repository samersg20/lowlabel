import { NextResponse } from "next/server";
import { withTenantTx } from "@/lib/tenant-tx";
import { submitRawZplToPrintNode } from "@/lib/printnode";
import { makeZplLabel } from "@/lib/zpl";
import { STORAGE_METHOD_RULES, STORAGE_METHODS, type StorageMethod } from "@/lib/constants";
import { Prisma } from "@prisma/client";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

type PrintCard = {
  itemId: string;
  quantity: number;
  methodId?: number | string;
};

function json(data: any, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...JSON_HEADERS, ...(init?.headers || {}) },
  });
}

async function resolveUnitName(db: any, unitId: string) {
  const unit = await db.unit.findFirst({
    where: { OR: [{ id: unitId }, { name: unitId }] },
    select: { name: true },
  });
  if (!unit) throw new Error("unit_not_found");
  return unit.name;
}

function enabledMethodsForItem(item: any): StorageMethod[] {
  const methods: StorageMethod[] = [];
  if (item.methodQuente) methods.push("QUENTE");
  if (item.methodPistaFria) methods.push("PISTA FRIA");
  if (item.methodDescongelando) methods.push("DESCONGELANDO");
  if (item.methodResfriado) methods.push("RESFRIADO");
  if (item.methodCongelado) methods.push("CONGELADO");
  if (item.methodAmbienteSecos) methods.push("AMBIENTE");
  return methods;
}

function pickDefaultMethod(item: any): StorageMethod | null {
  const enabled = enabledMethodsForItem(item);
  if (item.preferredStorageMethod && enabled.includes(item.preferredStorageMethod as StorageMethod)) {
    return item.preferredStorageMethod as StorageMethod;
  }
  return STORAGE_METHODS.find((m) => enabled.includes(m)) ?? null;
}

export async function POST(req: Request) {
  try {
    return await withTenantTx(req, async ({ db, tenantId, session }) => {
      const body = await req.json().catch(() => ({}));
      const unitId = String(body.unitId || session.user.unit || "").trim();
      const cards = Array.isArray(body.cards) ? (body.cards as PrintCard[]) : [];

      if (!unitId) return json({ error: "Unidade inválida" }, { status: 400 });
      if (!cards.length) return json({ error: "Nenhum item para imprimir" }, { status: 400 });

      let unitName = unitId;
      try {
        unitName = await resolveUnitName(db, unitId);
      } catch {
        return json({ error: "Unidade inválida" }, { status: 400 });
      }

      const itemIds = cards.map((card) => String(card.itemId || "").trim()).filter(Boolean);
      if (itemIds.length !== cards.length) {
        return json({ error: "Cards inválidos" }, { status: 400 });
      }

      const items: Array<
        Prisma.ItemGetPayload<{
          select: {
            id: true;
            name: true;
            itemCode: true;
            sif: true;
            methodQuente: true;
            methodPistaFria: true;
            methodDescongelando: true;
            methodResfriado: true;
            methodCongelado: true;
            methodAmbienteSecos: true;
            preferredStorageMethod: true;
          };
        }>
      > = await db.item.findMany({
        where: { id: { in: Array.from(new Set(itemIds)) } },
        select: {
          id: true,
          name: true,
          itemCode: true,
          sif: true,
          methodQuente: true,
          methodPistaFria: true,
          methodDescongelando: true,
          methodResfriado: true,
          methodCongelado: true,
          methodAmbienteSecos: true,
          preferredStorageMethod: true,
        },
      });
      const itemById = new Map(items.map((item) => [item.id, item]));

      const printerConfig = await db.printerConfig.findFirst({ where: { unit: unitName, isActive: true } });
      const printerId = printerConfig?.printerId || Number(process.env.PRINTNODE_PRINTER_ID || process.env.PRINTNODE_PRINT_ID || 0);
      const apiKey = printerConfig?.apiKey || process.env.PRINTNODE_API_KEY || "";
      if (!printerId || !apiKey) {
        return json({ error: "Impressora não configurada para a unidade do usuário" }, { status: 400 });
      }

      const results: Array<{ itemName: string; quantity: number; method: string; jobIds: number[] }> = [];
      const methodCache = new Map<number, { name: string; durationValue: number; durationUnit: string } | null>();

      for (const card of cards) {
        const quantity = Number(card.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) {
          return json({ error: "Quantidade inválida" }, { status: 400 });
        }

        const item = itemById.get(String(card.itemId));
        if (!item) return json({ error: "Item não encontrado" }, { status: 404 });

        let storageMethod = pickDefaultMethod(item);
        let methodConfig: { durationValue: number; durationUnit: string } | null = null;

        if (card.methodId !== undefined && card.methodId !== null && card.methodId !== "") {
          const methodId = Number(card.methodId);
          if (!Number.isInteger(methodId)) {
            return json({ error: "Método inválido" }, { status: 400 });
          }

          let cached = methodCache.get(methodId);
          if (cached === undefined) {
            const methodRow = await db.method.findFirst({
              where: { id: methodId },
              select: { name: true, durationValue: true, durationUnit: true },
            });
            cached = methodRow
              ? { name: String(methodRow.name || "").trim().toUpperCase(), durationValue: methodRow.durationValue, durationUnit: methodRow.durationUnit }
              : null;
            methodCache.set(methodId, cached);
          }

          if (!cached?.name) return json({ error: "Método inválido" }, { status: 400 });
          const enabled = enabledMethodsForItem(item);
          if (!enabled.includes(cached.name as StorageMethod)) {
            return json({ error: `Método não habilitado para ${item.name}` }, { status: 400 });
          }
          storageMethod = cached.name as StorageMethod;
          methodConfig = { durationValue: cached.durationValue, durationUnit: cached.durationUnit };
        }

        if (!storageMethod) {
          return json({ error: `Item sem método habilitado: ${item.name}` }, { status: 400 });
        }

        if (!methodConfig) {
          const fallbackRule = STORAGE_METHOD_RULES[storageMethod as keyof typeof STORAGE_METHOD_RULES];
          methodConfig = { durationValue: fallbackRule.amount, durationUnit: fallbackRule.unit };
        }

        const producedAt = new Date();
        const multiplier = methodConfig.durationUnit === "hours" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const expiresAt = new Date(producedAt.getTime() + methodConfig.durationValue * multiplier);

        await db.labelPrint.create({
          data: {
            tenantId,
            itemId: item.id,
            storageMethod,
            producedAt,
            expiresAt,
            userId: session.user.id,
            quantity,
          },
        });

        const zpl = makeZplLabel({
          name: item.name,
          storageMethod,
          producedAt,
          expiresAt,
          userName: session.user.name || "ADMIN",
          sif: item.sif,
        });

        const jobIds = await submitRawZplToPrintNode(zpl, quantity, `Etiqueta ${item.name}`, { apiKey, printerId });
        results.push({ itemName: item.name, quantity, method: storageMethod, jobIds });
      }

      return json({ ok: true, printed: results });
    });
  } catch (error: any) {
    return json({ error: error?.message || "Falha ao imprimir etiquetas" }, { status: 500 });
  }
}
