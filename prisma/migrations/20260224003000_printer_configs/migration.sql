CREATE TABLE "PrinterConfig" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "apiKey" TEXT NOT NULL,
  "printerId" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PrinterConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrinterConfig_unit_key" ON "PrinterConfig"("unit");

ALTER TABLE "PrinterConfig"
ADD CONSTRAINT "PrinterConfig_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
