-- Multi-tenant foundation

-- 1) Tenant table
CREATE TABLE IF NOT EXISTS "Tenant" (
  "id" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "legalName" TEXT,
  "tradeName" TEXT,
  "cnpj" TEXT,
  "businessAddress" TEXT,
  "neighborhood" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zipCode" TEXT,
  "stateRegistration" TEXT,
  "printerLimit" INTEGER NOT NULL DEFAULT 1,
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "subscriptionStatus" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_cnpj_key" ON "Tenant" ("cnpj");

-- 2) Add tenantId columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Method" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Unit" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ItemGroup" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PrinterConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "LabelPrint" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- 3) Foreign keys to Tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_tenantId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Item_tenantId_fkey'
  ) THEN
    ALTER TABLE "Item"
      ADD CONSTRAINT "Item_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Method_tenantId_fkey'
  ) THEN
    ALTER TABLE "Method"
      ADD CONSTRAINT "Method_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Unit_tenantId_fkey'
  ) THEN
    ALTER TABLE "Unit"
      ADD CONSTRAINT "Unit_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ItemGroup_tenantId_fkey'
  ) THEN
    ALTER TABLE "ItemGroup"
      ADD CONSTRAINT "ItemGroup_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PrinterConfig_tenantId_fkey'
  ) THEN
    ALTER TABLE "PrinterConfig"
      ADD CONSTRAINT "PrinterConfig_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LabelPrint_tenantId_fkey'
  ) THEN
    ALTER TABLE "LabelPrint"
      ADD CONSTRAINT "LabelPrint_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) Replace global unique constraints with tenant-scoped uniques
ALTER TABLE "Method" DROP CONSTRAINT IF EXISTS "Method_name_key";
ALTER TABLE "Unit" DROP CONSTRAINT IF EXISTS "Unit_name_key";
ALTER TABLE "ItemGroup" DROP CONSTRAINT IF EXISTS "ItemGroup_name_key";
ALTER TABLE "PrinterConfig" DROP CONSTRAINT IF EXISTS "PrinterConfig_unit_key";

DROP INDEX IF EXISTS "Method_name_key";
DROP INDEX IF EXISTS "Unit_name_key";
DROP INDEX IF EXISTS "ItemGroup_name_key";
DROP INDEX IF EXISTS "PrinterConfig_unit_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Method_tenantId_name_key" ON "Method"("tenantId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "Unit_tenantId_name_key" ON "Unit"("tenantId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "ItemGroup_tenantId_name_key" ON "ItemGroup"("tenantId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "PrinterConfig_tenantId_unit_key" ON "PrinterConfig"("tenantId", "unit");

-- 5) Helpful indexes
CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX IF NOT EXISTS "Item_tenantId_idx" ON "Item"("tenantId");
CREATE INDEX IF NOT EXISTS "LabelPrint_tenantId_idx" ON "LabelPrint"("tenantId");
