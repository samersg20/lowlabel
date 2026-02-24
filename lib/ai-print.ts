import { STORAGE_METHOD_RULES, STORAGE_METHODS, type StorageMethod } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { makeZplLabel } from "@/lib/zpl";
import { submitRawZplToPrintNode } from "@/lib/printnode";

type AiOrder = { itemId?: string; quantity?: number; itemName?: string };

type SessionUser = { id: string; name: string; unit: string };

function enabledMethodsForItem(item: any): StorageMethod[] {
  const methods: StorageMethod[] = [];
  if (item.methodQuente) methods.push("QUENTE");
  if (item.methodPistaFria) methods.push("PISTA FRIA");
  if (item.methodDescongelando) methods.push("DESCONGELANDO");
  if (item.methodResfriado) methods.push("RESFRIADO");
  if (item.methodCongelado) methods.push("CONGELADO");
  if (item.methodAmbienteSecos) methods.push("AMBIENTE SECOS");
  return methods;
}

function pickDefaultMethod(item: any): StorageMethod | null {
  const enabled = enabledMethodsForItem(item);
  return STORAGE_METHODS.find((m) => enabled.includes(m)) ?? null;
}

async function parseWithGemini(input: string, items: Array<{ id: string; name: string }>, model: string): Promise<AiOrder[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

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

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Falha na API Gemini: ${txt}`);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  return Array.isArray(parsed?.orders) ? parsed.orders : [];
}

export async function processAiPrintOrder({
  input,
  sessionUser,
  model,
  maxQuantity,
}: {
  input: string;
  sessionUser: SessionUser;
  model: string;
  maxQuantity: number;
}) {
  const items = await prisma.item.findMany({
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
    },
    orderBy: { name: "asc" },
  });

  const aiOrders = await parseWithGemini(input, items.map((i) => ({ id: i.id, name: i.name })), model);
  if (!aiOrders.length) {
    throw new Error("Não consegui identificar itens válidos no texto");
  }

  const byId = new Map(items.map((i) => [i.id, i]));
  const printerConfig = await prisma.printerConfig.findFirst({ where: { unit: sessionUser.unit, isActive: true } });
  const results: Array<{ itemName: string; quantity: number; method: string; jobIds: number[] }> = [];

  for (const order of aiOrders) {
    const quantity = Number(order.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity) {
      throw new Error(`Quantidade inválida para item ${order.itemName || order.itemId || "desconhecido"} (1-${maxQuantity})`);
    }

    const item = order.itemId ? byId.get(order.itemId) : null;
    if (!item) continue;

    const storageMethod = pickDefaultMethod(item);
    if (!storageMethod) {
      throw new Error(`Item sem método habilitado: ${item.name}`);
    }

    const rule = STORAGE_METHOD_RULES[storageMethod];
    const producedAt = new Date();
    const multiplier = rule.unit === "hours" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = new Date(producedAt.getTime() + rule.amount * multiplier);

    await prisma.labelPrint.create({
      data: {
        itemId: item.id,
        storageMethod,
        producedAt,
        expiresAt,
        userId: sessionUser.id,
        quantity,
      },
    });

    const zpl = makeZplLabel({
      name: item.name,
      storageMethod,
      producedAt,
      expiresAt,
      userName: sessionUser.name,
      sif: item.sif,
    });

    const jobIds = await submitRawZplToPrintNode(
      zpl,
      quantity,
      `Etiqueta ${item.name} - ${storageMethod}`,
      printerConfig ? { apiKey: printerConfig.apiKey, printerId: printerConfig.printerId } : undefined,
    );

    results.push({ itemName: item.name, quantity, method: storageMethod, jobIds });
  }

  if (!results.length) {
    throw new Error("Nenhum item válido encontrado para impressão");
  }

  return results;
}
