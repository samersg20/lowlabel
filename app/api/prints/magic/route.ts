import { NextResponse } from "next/server";
import { withTenantTx } from "@/lib/tenant-tx";
import { resolveItemsFast, preloadTenantItems } from "@/lib/magic-resolver";
import { parseAiPrintOrder } from "@/lib/ai-print";
import { requireUnitForTenant } from "@/lib/unit-validation";
import { submitRawZplToPrintNode } from "@/lib/printnode";
import { makeZplLabel } from "@/lib/zpl";
import { STORAGE_METHOD_RULES, STORAGE_METHODS, type StorageMethod } from "@/lib/constants";
import { extractQuantity, splitSegments } from "@/lib/magic-text";
import { saveAlias } from "@/lib/alias-resolver";
import { transcribeAudio } from "@/lib/openai-transcribe";

const AI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function json(data: any, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...JSON_HEADERS, ...(init?.headers || {}) },
  });
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
    console.time("magic_total");
    return await withTenantTx(req, async ({ db, tenantId, session }) => {
      const contentType = req.headers.get("content-type") || "";
      let text = "";
      let source: "text" | "audio" | "none" = "none";
      let audio: File | null = null;

      if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        const audioField = form.get("audio");
        const textField = String(form.get("text") || "").trim();
        if (audioField instanceof File) audio = audioField;
        if (textField) {
          text = textField;
          source = "text";
        }
      } else {
        const body = await req.json().catch(() => ({}));
        text = String(body.text || "").trim();
        source = "text";
      }

      const preload = preloadTenantItems(tenantId, db);
      const unitCheck = requireUnitForTenant(db, session.user.unit);

      if (audio) {
        const [_, __, transcribed] = await Promise.all([
          preload,
          unitCheck,
          transcribeAudio(audio),
        ]);
        if (!text) {
          text = transcribed;
          source = "audio";
        }
      } else {
        await Promise.all([preload, unitCheck]);
      }

      if (!text) return json({ error: "Texto é obrigatório" }, { status: 400 });
      console.time("local_resolve");
      const local = await resolveItemsFast(text, tenantId, db);
      console.timeEnd("local_resolve");

      const useLocal = local.confidenceLevel === "high" && local.items.length > 0;
      const useLocalWithWarning = local.confidenceLevel === "medium" && local.items.length > 0;

      if (useLocalWithWarning) {
        console.warn("[magic] medium confidence", { tenantId, confidence: local.confidence });
      }

      let orders: any[] = [];
      if (useLocal || useLocalWithWarning) {
        orders = local.items.map((entry) => ({
          item: entry.item,
          quantity: entry.quantity,
          storageMethod: pickDefaultMethod(entry.item),
        }));
      } else {
        console.time("ai_fallback");
        orders = await parseAiPrintOrder({ input: text, model: AI_TEXT_MODEL, maxQuantity: 10, tenantId, db });
        console.timeEnd("ai_fallback");
      }

      if (!orders.length) return json({ error: "Nenhum item válido encontrado" }, { status: 400 });

      const printerConfig = await db.printerConfig.findFirst({ where: { unit: session.user.unit, isActive: true } });
      const printerId = printerConfig?.printerId || Number(process.env.PRINTNODE_PRINTER_ID || process.env.PRINTNODE_PRINT_ID || 0);
      const apiKey = printerConfig?.apiKey || process.env.PRINTNODE_API_KEY || "";
      if (!printerId || !apiKey) {
        return json({ error: "Impressora não configurada para a unidade do usuário" }, { status: 400 });
      }

      const results: Array<{ itemName: string; quantity: number; method: string; jobIds: number[] }> = [];
      for (const order of orders as any[]) {
        const storageMethod = order.storageMethod ?? pickDefaultMethod(order.item);
        if (!storageMethod) {
          return json({ error: `Item sem método habilitado: ${order.item.name}` }, { status: 400 });
        }

        const producedAt = new Date();
        const rule = STORAGE_METHOD_RULES[storageMethod as keyof typeof STORAGE_METHOD_RULES];
        const multiplier = rule.unit === "hours" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const expiresAt = new Date(producedAt.getTime() + rule.amount * multiplier);

        const print = await db.labelPrint.create({
          data: {
            tenantId,
            itemId: order.item.id,
            storageMethod,
            producedAt,
            expiresAt,
            userId: session.user.id,
            quantity: order.quantity,
          },
        });

        const zpl = makeZplLabel({
          name: order.item.name,
          storageMethod,
          producedAt,
          expiresAt,
          userName: session.user.name || "ADMIN",
          sif: order.item.sif,
        });

        const jobIds = await submitRawZplToPrintNode(zpl, order.quantity, `Etiqueta ${order.item.name}`, { apiKey, printerId });
        results.push({ itemName: order.item.name, quantity: order.quantity, method: storageMethod, jobIds });
      }

      if (!useLocal && local.confidenceLevel === "low") {
        const segments = splitSegments(text).map((segment) => extractQuantity(segment).text);
        for (let i = 0; i < Math.min(segments.length, orders.length); i += 1) {
          await saveAlias(tenantId, segments[i], orders[i].item.id, db);
        }
      }

      return json({
        ok: true,
        results,
        model: useLocal || useLocalWithWarning ? "local" : AI_TEXT_MODEL,
        confidence: local.confidence,
        confidenceLevel: local.confidenceLevel,
        source,
        text,
      });
    });
  } catch (error: any) {
    return json({ error: error?.message || "Falha ao emitir etiquetas" }, { status: 500 });
  } finally {
    console.timeEnd("magic_total");
  }
}
