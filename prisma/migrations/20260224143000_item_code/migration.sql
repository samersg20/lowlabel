ALTER TABLE "Item" ADD COLUMN "itemCode" TEXT;

WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") + 100000 AS code_num
  FROM "Item"
)
UPDATE "Item" i
SET "itemCode" = LPAD(numbered.code_num::text, 6, '0')
FROM numbered
WHERE i."id" = numbered."id";

ALTER TABLE "Item" ALTER COLUMN "itemCode" SET NOT NULL;

CREATE UNIQUE INDEX "Item_itemCode_key" ON "Item"("itemCode");
