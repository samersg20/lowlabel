import { tenantDb } from "@/lib/tenant-db";
import { normalizeText } from "@/lib/magic-text";

export async function findAlias(tenantId: string, normalizedText: string, dbOverride?: any) {
  const db = dbOverride ?? tenantDb(tenantId);
  const aliasRow = await db.itemAlias.findFirst({ where: { alias: normalizedText } });
  if (!aliasRow) return null;
  return db.item.findFirst({ where: { id: aliasRow.itemId } });
}

export async function saveAlias(tenantId: string, alias: string, itemId: string, dbOverride?: any) {
  const db = dbOverride ?? tenantDb(tenantId);
  const normalized = normalizeText(alias);
  if (!normalized) return;
  await db.itemAlias.createMany({
    data: [{ tenantId, alias: normalized, itemId }],
    skipDuplicates: true,
  });
}
