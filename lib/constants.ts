export const STORAGE_METHODS = [
  "RESFRIADO",
  "CONGELADO",
  "AMBIENTE",
  "QUENTE",
  "DESCONGELANDO",
] as const;

export type StorageMethod = (typeof STORAGE_METHODS)[number];
