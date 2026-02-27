const COMBINING_MARKS = /[\u0300-\u036f]/g;
const NON_ALNUM = /[^A-Z0-9\s]/g;
const MULTI_SPACE = /\s+/g;

export function normalizeText(input: string) {
  return input
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toUpperCase()
    .replace(NON_ALNUM, " ")
    .replace(MULTI_SPACE, " ")
    .trim();
}

export function splitSegments(text: string) {
  const parts = text.split(/[\n,;]+/g).map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts : [text.trim()];
}

export function extractQuantity(segment: string) {
  const match = segment.match(/^\s*(\d+)\s+(.*)$/);
  if (!match) return { quantity: 1, text: segment };
  const qty = Math.max(1, Number(match[1]));
  return { quantity: Number.isFinite(qty) ? qty : 1, text: match[2].trim() };
}

const BROKEN_CHARS = /[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeText(input: string) {
  return String(input || "").replace(BROKEN_CHARS, "");
}
