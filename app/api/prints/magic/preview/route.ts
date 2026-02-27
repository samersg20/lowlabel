import { NextResponse } from "next/server";
import { withTenantTx } from "@/lib/tenant-tx";
import { segmentMagicInput } from "@/lib/magic-segmentation";
import { resolveItemsFast } from "@/lib/magic-resolver";
import { sanitizeText } from "@/lib/magic-text";
import { parseAiPrintOrder } from "@/lib/ai-print";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const HIGH_CONFIDENCE = 0.85;
const MEDIUM_CONFIDENCE = 0.6;
const AI_MAX_QTY = 20;

type PreviewCard = {
  id: string;
  itemId?: string;
  itemName: string;
  quantity: number;
  confidence: number;
  badge: "high" | "medium" | "low";
  status: "ok" | "unknown";
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

function badgeFromConfidence(confidence: number): "high" | "medium" | "low" {
  if (confidence >= HIGH_CONFIDENCE) return "high";
  if (confidence >= MEDIUM_CONFIDENCE) return "medium";
  return "low";
}

export async function POST(req: Request) {
  console.time("magic_preview");
  try {
    return await withTenantTx(req, async ({ db, tenantId, session }) => {
      const body = await req.json().catch(() => ({}));
      const text = sanitizeText(String(body.text || "")).trim();
      const unitId = String(body.unitId || session.user.unit || "").trim();

      if (!text) return json({ error: "Texto é obrigatório" }, { status: 400 });
      if (!unitId) return json({ error: "Unidade inválida" }, { status: 400 });

      try {
        await resolveUnitName(db, unitId);
      } catch {
        return json({ error: "Unidade inválida" }, { status: 400 });
      }

      const segments = segmentMagicInput(text);
      if (!segments.length) return json({ error: "Nenhum item válido encontrado" }, { status: 400 });

      console.time("magic_preview_resolve");
      const resolved = await resolveItemsFast({ segments, tenantId }, db);
      console.timeEnd("magic_preview_resolve");

      const aiEnabled = Boolean(process.env.OPENAI_API_KEY);
      const aiModel = String(process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini");

      const cards: PreviewCard[] = [];
      const cardIndexByItem = new Map<string, number>();

      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        let resolvedEntry = resolved[index];

        if ((!resolvedEntry.itemId || resolvedEntry.confidence < MEDIUM_CONFIDENCE) && aiEnabled) {
          try {
            const aiOrders = await parseAiPrintOrder({
              input: segment.raw,
              model: aiModel,
              maxQuantity: AI_MAX_QTY,
              tenantId,
              db,
            });
            const aiItem = aiOrders[0]?.item;
            if (aiItem) {
              resolvedEntry = {
                itemId: aiItem.id,
                itemName: aiItem.name,
                confidence: Math.max(resolvedEntry.confidence, MEDIUM_CONFIDENCE),
                candidates: resolvedEntry.candidates,
              };
            }
          } catch {
            // keep local resolution
          }
        }

        if (resolvedEntry.itemId && resolvedEntry.itemName) {
          const existingIndex = cardIndexByItem.get(resolvedEntry.itemId);
          const confidence = resolvedEntry.confidence || 0;
          if (existingIndex === undefined) {
            const badge = badgeFromConfidence(confidence);
            cardIndexByItem.set(resolvedEntry.itemId, cards.length);
            cards.push({
              id: resolvedEntry.itemId,
              itemId: resolvedEntry.itemId,
              itemName: resolvedEntry.itemName,
              quantity: segment.qty,
              confidence,
              badge,
              status: "ok",
            });
          } else {
            const existing = cards[existingIndex];
            existing.quantity += segment.qty;
            existing.confidence = Math.min(existing.confidence, confidence || existing.confidence);
            existing.badge = badgeFromConfidence(existing.confidence);
          }
        } else {
          cards.push({
            id: `unknown-${index}`,
            itemName: segment.raw,
            quantity: segment.qty,
            confidence: 0,
            badge: "low",
            status: "unknown",
          });
        }
      }

      return json({ ok: true, cards, text });
    });
  } catch (error: any) {
    return json({ error: error?.message || "Falha ao gerar prévia" }, { status: 500 });
  } finally {
    console.timeEnd("magic_preview");
  }
}
