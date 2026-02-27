import { STORAGE_METHOD_RULES, STORAGE_METHODS, type StorageMethod } from "@/lib/constants";
import { tenantDb } from "@/lib/tenant-db";
import { makeZplLabel } from "@/lib/zpl";
import { submitRawZplToPrintNode } from "@/lib/printnode";
import { requireUnitForTenant } from "@/lib/unit-validation";

type AiOrder = { itemId?: string; quantity?: number; itemName?: string };

type SessionUser = { id: string; name: string; unit: string; tenantId: string };

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

async function parseWithOpenAI(input: string, items: Array<{ id: string; name: string }>, model: string): Promise<AiOrder[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");

  const prompt = [
    "Você é um parser de pedidos de etiquetas.",
    "Converta o texto do usuário em um JSON válido SEM markdown.",
    "Retorne no formato: {\"orders\":[{\"itemId\":\"...\",\"quantity\":0}]}",
    "Use SOMENTE itemId da lista fornecida.",
    "Se não encontrar item, ignore.",
    "quantity deve ser inteiro positivo.",
    `Itens disponíveis: ${JSON.stringify(items)}`,
    `Texto do usuário: ${input}`,
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model.trim(),
      temperature: model.trim().startsWith('o') ? 1 : 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Extraia pedidos de etiquetas em JSON no formato {\"orders\":[{\"itemId\":\"...\",\"quantity\":1}]}",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Falha na API OpenAI: ${txt}`);
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content || "";
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  return Array.isArray(parsed?.orders) ? parsed.orders : [];
}

export async function processAiPrintOrder({
  input,
  sessionUser,
  model,
  maxQuantity,
  db: providedDb,
}: {
  input: string;
  sessionUser: SessionUser;
  model: string;
  maxQuantity: number;
  db?: any;
}) {
  const db = providedDb ?? tenantDb(sessionUser.tenantId);
  const parsedOrders = await parseAiPrintOrder({ input, model, maxQuantity, tenantId: sessionUser.tenantId, db });

  try {
    await requireUnitForTenant(db, sessionUser.unit);
  } catch {
    throw new Error("Unidade inválida");
  }

  const printerConfig = await db.printerConfig.findFirst({ where: { unit: sessionUser.unit, isActive: true } });
  const results: Array<{ itemName: string; quantity: number; method: string; jobIds: number[] }> = [];

  for (const parsed of parsedOrders) {
    const producedAt = new Date();
    const rule = STORAGE_METHOD_RULES[parsed.storageMethod];
    const multiplier = rule.unit === "hours" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = new Date(producedAt.getTime() + rule.amount * multiplier);

    await db.labelPrint.create({
      data: {
        tenantId: sessionUser.tenantId,
        itemId: parsed.item.id,
        storageMethod: parsed.storageMethod,
        producedAt,
        expiresAt,
        userId: sessionUser.id,
        quantity: parsed.quantity,
      },
    });

    const zpl = makeZplLabel({
      name: parsed.item.name,
      storageMethod: parsed.storageMethod,
      producedAt,
      expiresAt,
      userName: sessionUser.name,
      sif: parsed.item.sif,
    });

    const jobIds = await submitRawZplToPrintNode(
      zpl,
      parsed.quantity,
      `Etiqueta ${parsed.item.name} - ${parsed.storageMethod}`,
      printerConfig ? { apiKey: printerConfig.apiKey, printerId: printerConfig.printerId } : undefined,
    );

    results.push({ itemName: parsed.item.name, quantity: parsed.quantity, method: parsed.storageMethod, jobIds });
  }

  return results;
}

export async function parseAiPrintOrder({
  input,
  model,
  maxQuantity,
  tenantId,
  db: providedDb,
}: {
  input: string;
  model: string;
  maxQuantity: number;
  tenantId: string;
  db?: any;
}) {
  const db = providedDb ?? tenantDb(tenantId);
  const items: Array<{
    id: string;
    name: string;
    sif: string | null;
    methodQuente: boolean;
    methodPistaFria: boolean;
    methodDescongelando: boolean;
    methodResfriado: boolean;
    methodCongelado: boolean;
    methodAmbienteSecos: boolean;
    preferredStorageMethod: string | null;
  }> = await db.item.findMany({
    select: {
      id: true,
      name: true,
      sif: true,
      methodQuente: true,
      methodPistaFria: true,
      methodDescongelando: true,
      methodResfriado: true,
      methodCongelado: true,
      methodAmbienteSecos: true,
      preferredStorageMethod: true,
    },
    orderBy: { name: "asc" },
  });

  const aiOrders = await parseWithOpenAI(input, items.map((i) => ({ id: i.id, name: i.name })), model);
  if (!aiOrders.length) throw new Error("Não consegui identificar itens válidos no texto");

  const byId = new Map(items.map((i) => [i.id, i]));
  const parsedResults: Array<{ item: (typeof items)[number]; quantity: number; storageMethod: StorageMethod }> = [];

  for (const order of aiOrders) {
    const quantity = Number(order.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity) {
      throw new Error(`Quantidade inválida para item ${order.itemName || order.itemId || "desconhecido"} (1-${maxQuantity})`);
    }

    const item = order.itemId ? byId.get(order.itemId) : null;
    if (!item) continue;

    const storageMethod = pickDefaultMethod(item);
    if (!storageMethod) throw new Error(`Item sem método habilitado: ${item.name}`);

    parsedResults.push({ item, quantity, storageMethod });
  }

  const totalQuantity = parsedResults.reduce((sum, row) => sum + row.quantity, 0);
  if (totalQuantity > maxQuantity) throw new Error(`Máximo ${maxQuantity} etiquetas por requisição`);
  if (!parsedResults.length) throw new Error("Nenhum item válido encontrado para impressão");

  return parsedResults;
}



