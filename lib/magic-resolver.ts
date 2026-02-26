import { tenantDb } from "@/lib/tenant-db";
import { findAlias } from "@/lib/alias-resolver";
import { extractQuantity, normalizeText, splitSegments } from "@/lib/magic-text";

type CachedItems = {
  expiresAt: number;
  items: Array<{
    id: string;
    name: string;
    itemCode: string;
    sif: string | null;
    methodQuente: boolean;
    methodPistaFria: boolean;
    methodDescongelando: boolean;
    methodResfriado: boolean;
    methodCongelado: boolean;
    methodAmbienteSecos: boolean;
    preferredStorageMethod: string | null;
  }>;
};

const CACHE_TTL_MS = 120_000;
const cache = new Map<string, CachedItems>();

function diceCoefficient(a: string, b: string) {
  if (a.length < 2 || b.length < 2) return 0;
  const pairs = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i += 1) {
    const pair = a.slice(i, i + 2);
    pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
  }
  let intersection = 0;
  for (let i = 0; i < b.length - 1; i += 1) {
    const pair = b.slice(i, i + 2);
    const count = pairs.get(pair) ?? 0;
    if (count > 0) {
      pairs.set(pair, count - 1);
      intersection += 1;
    }
  }
  return (2 * intersection) / (a.length - 1 + (b.length - 1));
}

async function loadItems(tenantId: string, dbOverride?: any) {
  const now = Date.now();
  const cached = cache.get(tenantId);
  if (cached && cached.expiresAt > now) return cached.items;

  const db = dbOverride ?? tenantDb(tenantId);
  const items = await db.item.findMany({
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
    orderBy: { name: "asc" },
  });

  cache.set(tenantId, { items, expiresAt: now + CACHE_TTL_MS });
  return items;
}

export async function preloadTenantItems(tenantId: string, dbOverride?: any) {
  await loadItems(tenantId, dbOverride);
}

export async function resolveItemsFast(text: string, tenantId: string, dbOverride?: any) {
  const items = await loadItems(tenantId, dbOverride);
  const segments = splitSegments(text);
  const normalizedText = normalizeText(text);
  const results = new Map<string, { item: (typeof items)[number]; quantity: number; score: number }>();
  let totalScore = 0;
  let matchedCount = 0;

  for (const segment of segments) {
    const { quantity, text: raw } = extractQuantity(segment);
    const query = normalizeText(raw);
    if (!query) continue;

    let best: { item: (typeof items)[number]; score: number } | null = null;

    const alias = await findAlias(tenantId, query, dbOverride);
    if (alias) {
      best = { item: alias, score: 0.95 };
    }

    for (const item of items) {
      const code = normalizeText(item.itemCode || "");
      const name = normalizeText(item.name || "");
      let score = 0;

      if (code && query.includes(code)) score = Math.max(score, 1);
      if (name && query === name) score = Math.max(score, 0.95);
      if (name && query.includes(name)) score = Math.max(score, 0.85);
      if (name && name.length >= 4 && normalizedText.includes(name)) score = Math.max(score, 0.8);

      const similarity = diceCoefficient(query, name);
      if (similarity > 0.6) score = Math.max(score, similarity);

      if (!best || score > best.score) {
        best = { item, score };
      }
    }

    if (best && best.score >= 0.35) {
      const existing = results.get(best.item.id);
      const nextQty = (existing?.quantity ?? 0) + quantity;
      const nextScore = Math.max(existing?.score ?? 0, best.score);
      results.set(best.item.id, { item: best.item, quantity: nextQty, score: nextScore });
      totalScore += best.score;
      matchedCount += 1;
    }
  }

  const confidence = matchedCount ? Math.min(1, totalScore / matchedCount) : 0;
  const confidenceLevel = confidence >= 0.85 ? "high" : confidence >= 0.7 ? "medium" : "low";

  return {
    items: Array.from(results.values()).map((r) => ({ item: r.item, quantity: r.quantity })),
    confidence,
    confidenceLevel,
  };
}
