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

function levenshteinScore(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const aLen = a.length;
  const bLen = b.length;
  const dp = Array.from({ length: aLen + 1 }, () => new Array<number>(bLen + 1).fill(0));

  for (let i = 0; i <= aLen; i += 1) dp[i][0] = i;
  for (let j = 0; j <= bLen; j += 1) dp[0][j] = j;

  for (let i = 1; i <= aLen; i += 1) {
    for (let j = 1; j <= bLen; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  const distance = dp[aLen][bLen];
  const maxLen = Math.max(aLen, bLen);
  if (!maxLen) return 0;
  return Math.max(0, 1 - distance / maxLen);
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

  let best: { item: (typeof items)[number]; score: number; similarity: number } | null = null;
  const scored = new Map<string, MagicCandidate>();

  const alias = await findAlias(tenantId, query, dbOverride);
  if (alias) {
    const aliasName = normalizeText(alias.name || "");
    const aliasSimilarity = Math.max(
      diceCoefficient(query, aliasName),
      levenshteinScore(query, aliasName),
    );
    best = { item: alias, score: 0.95, similarity: aliasSimilarity };
    scored.set(alias.id, { id: alias.id, name: alias.name, score: 0.95 });
  }

  for (const item of items) {
    const code = normalizeText(item.itemCode || "");
    const name = normalizeText(item.name || "");
    let score = 0;
    const nameSimilarity = Math.max(
      diceCoefficient(query, name),
      levenshteinScore(query, name),
    );
    const codeSimilarity = code
      ? Math.max(diceCoefficient(query, code), levenshteinScore(query, code))
      : 0;
    const similarity = Math.max(nameSimilarity, codeSimilarity);
    score = Math.max(score, similarity);

    if (code && query.includes(code)) score = Math.max(score, 1);
    if (name && query === name) score = Math.max(score, 0.95);
    if (name && query.includes(name)) score = Math.max(score, 0.85);
    if (name && name.length >= 4 && query.includes(name)) score = Math.max(score, 0.8);

    if (score > 0) {
      const existing = scored.get(item.id);
      if (!existing || score > existing.score) {
        scored.set(item.id, { id: item.id, name: item.name, score });
      }
    }
    if (!best || score > best.score) {
      best = { item, score, similarity };
    }
  }

  const candidates = Array.from(scored.values()).sort((a, b) => b.score - a.score).slice(0, 5);

  if (!best) return { confidence: 0, candidates };

  return {
    itemId: best.item.id,
    itemName: best.item.name,
    confidence: best.similarity,
    candidates,
  };
}

export async function resolveItemsFast(
  { segments, tenantId }: { segments: Array<{ textNormalized: string }>; tenantId: string },
  dbOverride?: any,
) {
  await preloadTenantItems(tenantId, dbOverride);
  return Promise.all(
    segments.map((segment) => resolveOneSegment({ textNormalized: segment.textNormalized, tenantId }, dbOverride)),
  );
}
