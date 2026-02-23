-- Add unit to users
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "unit" TEXT NOT NULL DEFAULT 'BROOKLIN';

-- Create groups table
CREATE TABLE IF NOT EXISTS "ItemGroup" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ItemGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ItemGroup_name_key" ON "ItemGroup"("name");

-- Link items to groups
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "groupId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Item_groupId_fkey'
  ) THEN
    ALTER TABLE "Item"
      ADD CONSTRAINT "Item_groupId_fkey"
      FOREIGN KEY ("groupId") REFERENCES "ItemGroup"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
