import { tenantDb } from "@/lib/tenant-db";
import { findAlias } from "@/lib/alias-resolver";
import { normalizeText } from "@/lib/magic-text";

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

export type MagicCandidate = { id: string; name: string; score: number };
export type MagicResolvedSegment = {
  itemId?: string;
  itemName?: string;
  confidence: number;
  candidates: MagicCandidate[];
};

export async function resolveOneSegment(
  { textNormalized, tenantId }: { textNormalized: string; tenantId: string },
  dbOverride?: any,
): Promise<MagicResolvedSegment> {
  const items = await loadItems(tenantId, dbOverride);
  const query = textNormalized;
  if (!query) return { confidence: 0, candidates: [] };

  let best: { item: (typeof items)[number]; score: number } | null = null;
  const scored = new Map<string, MagicCandidate>();

  const alias = await findAlias(tenantId, query, dbOverride);
  if (alias) {
    best = { item: alias, score: 0.95 };
    scored.set(alias.id, { id: alias.id, name: alias.name, score: 0.95 });
  }

  for (const item of items) {
    const code = normalizeText(item.itemCode || "");
    const name = normalizeText(item.name || "");
    let score = 0;

    if (code && query.includes(code)) score = Math.max(score, 1);
    if (name && query === name) score = Math.max(score, 0.95);
    if (name && query.includes(name)) score = Math.max(score, 0.85);
    if (name && name.length >= 4 && query.includes(name)) score = Math.max(score, 0.8);

    const similarity = diceCoefficient(query, name);
    if (similarity > 0.6) score = Math.max(score, similarity);

    if (score > 0) {
      const existing = scored.get(item.id);
      if (!existing || score > existing.score) {
        scored.set(item.id, { id: item.id, name: item.name, score });
      }
    }
    if (!best || score > best.score) {
      best = { item, score };
    }
  }

  const candidates = Array.from(scored.values()).sort((a, b) => b.score - a.score).slice(0, 5);

  if (!best) return { confidence: 0, candidates };

  return {
    itemId: best.item.id,
    itemName: best.item.name,
    confidence: best.score,
    candidates,
  };
}
