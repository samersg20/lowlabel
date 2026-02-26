export async function requireUnitForTenant(db: any, unitName: string) {
  const unit = await db.unit.findFirst({ where: { name: unitName } });
  if (!unit) {
    throw new Error("unit_not_found");
  }
  return unit;
}
