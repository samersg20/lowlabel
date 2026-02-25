-- Add unified method flags on Item for fixed business rules
ALTER TABLE "Item"
ADD COLUMN "methodQuente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "methodPistaFria" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "methodDescongelando" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "methodResfriado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "methodCongelado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "methodAmbienteSecos" BOOLEAN NOT NULL DEFAULT false;
