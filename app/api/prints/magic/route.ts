import { NextResponse } from "next/server";
import { withTenantTx } from "@/lib/tenant-tx";
import { preloadTenantItems, resolveOneSegment } from "@/lib/magic-resolver";
import { requireUnitForTenant } from "@/lib/unit-validation";
import { submitRawZplToPrintNode } from "@/lib/printnode";
import { makeZplLabel } from "@/lib/zpl";
import { STORAGE_METHOD_RULES, STORAGE_METHODS, type StorageMethod } from "@/lib/constants";
import { transcribeAudio } from "@/lib/openai-transcribe";
import { segmentMagicInput } from "@/lib/magic-segmentation";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const THRESHOLD_OK = 0.8;

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
      let preflight = false;

      if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        const audioField = form.get("audio");
        const textField = String(form.get("text") || "").trim();
        const preflightField = String(form.get("preflight") || "").toLowerCase();
        if (audioField instanceof File) audio = audioField;
        if (textField) {
          text = textField;
          source = "text";
        }
        if (preflightField === "true" || preflightField === "1") preflight = true;
      } else {
        const body = await req.json().catch(() => ({}));
        text = String(body.text || "").trim();
        source = "text";
        preflight = Boolean(body.preflight);
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

      const segments = segmentMagicInput(text);
      if (!segments.length) return json({ error: "Nenhum item válido encontrado" }, { status: 400 });

      console.time("local_resolve");
      const resolved = await Promise.all(
        segments.map((segment) => resolveOneSegment({ textNormalized: segment.textNormalized, tenantId }, db)),
      );
      console.timeEnd("local_resolve");

      const segmentResults = segments.map((segment, index) => {
        const resolvedSegment = resolved[index];
        return {
          index,
          raw: segment.raw,
          qty: segment.qty,
          textNormalized: segment.textNormalized,
          resolved: resolvedSegment.itemId
            ? { itemId: resolvedSegment.itemId, itemName: resolvedSegment.itemName, confidence: resolvedSegment.confidence }
            : { confidence: resolvedSegment.confidence },
        };
      });

      const failed = segmentResults
        .map((segment, index) => ({ segment, index, resolved: resolved[index] }))
        .filter(({ resolved }) => !resolved.itemId || resolved.confidence < THRESHOLD_OK)
        .map(({ segment, index, resolved }) => ({
          index,
          raw: segment.raw,
          qty: segment.qty,
          textNormalized: segment.textNormalized,
          confidence: resolved.confidence,
          topCandidates: resolved.candidates,
        }));

      if (failed.length) {
        return json(
          {
            ok: false,
            reason: "LOW_CONFIDENCE",
            segments: segmentResults,
            failed,
            suggestions: failed.map((entry) => ({ index: entry.index, candidates: entry.topCandidates })),
          },
          { status: 400 },
        );
      }

      if (preflight) {
        return json({
          ok: true,
          segments: segmentResults,
          printed: [],
          preflight: true,
          source,
          text,
        });
      }

      const itemIds = Array.from(new Set(resolved.map((entry) => entry.itemId).filter(Boolean) as string[]));
      if (!itemIds.length) return json({ error: "Nenhum item válido encontrado" }, { status: 400 });

      const items = await db.item.findMany({
        where: { id: { in: itemIds } },
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

      const orders = new Map<string, { item: (typeof items)[number]; quantity: number }>();
      segmentResults.forEach((segment) => {
        const itemId = segment.resolved?.itemId;
        if (!itemId) return;
        const item = itemById.get(itemId);
        if (!item) return;
        const existing = orders.get(itemId);
        const nextQty = (existing?.quantity ?? 0) + segment.qty;
        orders.set(itemId, { item, quantity: nextQty });
      });

      if (!orders.size) return json({ error: "Nenhum item válido encontrado" }, { status: 400 });

      const printerConfig = await db.printerConfig.findFirst({ where: { unit: session.user.unit, isActive: true } });
      const printerId = printerConfig?.printerId || Number(process.env.PRINTNODE_PRINTER_ID || process.env.PRINTNODE_PRINT_ID || 0);
      const apiKey = printerConfig?.apiKey || process.env.PRINTNODE_API_KEY || "";
      if (!printerId || !apiKey) {
        return json({ error: "Impressora não configurada para a unidade do usuário" }, { status: 400 });
      }

      const results: Array<{ itemName: string; quantity: number; method: string; jobIds: number[] }> = [];
      for (const order of orders.values()) {
        const storageMethod = pickDefaultMethod(order.item);
        if (!storageMethod) {
          return json({ error: `Item sem método habilitado: ${order.item.name}` }, { status: 400 });
        }

        const producedAt = new Date();
        const rule = STORAGE_METHOD_RULES[storageMethod as keyof typeof STORAGE_METHOD_RULES];
        const multiplier = rule.unit === "hours" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const expiresAt = new Date(producedAt.getTime() + rule.amount * multiplier);

        await db.labelPrint.create({
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

      return json({
        ok: true,
        segments: segmentResults,
        printed: results,
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
