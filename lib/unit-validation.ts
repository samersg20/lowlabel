import { tenantDb } from "@/lib/tenant-db";

export async function requireUnitForTenant(tenantId: string, unitName: string) {
  const db = tenantDb(tenantId);
  const unit = await db.unit.findFirst({ where: { name: unitName } });
  if (!unit) {
    throw new Error("unit_not_found");
  }
  return unit;
}
