export const STORAGE_METHODS = [
  "QUENTE",
  "PISTA FRIA",
  "DESCONGELANDO",
  "RESFRIADO",
  "CONGELADO",
  "AMBIENTE SECOS",
] as const;

export type StorageMethod = (typeof STORAGE_METHODS)[number];

export const STORAGE_METHOD_RULES: Record<StorageMethod, { amount: number; unit: "hours" | "days" }> = {
  QUENTE: { amount: 3, unit: "hours" },
  "PISTA FRIA": { amount: 3, unit: "hours" },
  DESCONGELANDO: { amount: 3, unit: "days" },
  RESFRIADO: { amount: 3, unit: "days" },
  CONGELADO: { amount: 30, unit: "days" },
  "AMBIENTE SECOS": { amount: 30, unit: "days" },
};
