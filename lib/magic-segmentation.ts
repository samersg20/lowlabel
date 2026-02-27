import { normalizeText } from "@/lib/magic-text";

const STRONG_SEPARATORS = /[\n,;.]+/g;
const WORD_NUMBER_MAP: Record<string, number> = {
  UM: 1,
  UMA: 1,
  DOIS: 2,
  DUAS: 2,
  TRES: 3,
  TRÊS: 3,
  QUATRO: 4,
  CINCO: 5,
  SEIS: 6,
  SETE: 7,
  OITO: 8,
  NOVE: 9,
  DEZ: 10,
  ONZE: 11,
  DOZE: 12,
  TREZE: 13,
  CATORZE: 14,
  QUATORZE: 14,
  QUINZE: 15,
  DEZESSEIS: 16,
  DEZESSETE: 17,
  DEZOITO: 18,
  DEZENOVE: 19,
  VINTE: 20,
};

const QTY_TOKEN_REGEX =
  /\b(\d+|um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte)\b/gi;

export type MagicSegment = {
  raw: string;
  qty: number;
  textNormalized: string;
};

function splitStrong(text: string) {
  const parts = text
    .split(STRONG_SEPARATORS)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [text.trim()];
}

function splitNumberedList(text: string) {
  const matches = [...text.matchAll(QTY_TOKEN_REGEX)];
  if (matches.length < 2) return [text];

  const segments: string[] = [];
  const firstIndex = matches[0]?.index ?? 0;
  if (firstIndex > 0) {
    const leading = text.slice(0, firstIndex).trim();
    if (leading) segments.push(leading);
  }

  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i]?.index ?? 0;
    const end = matches[i + 1]?.index ?? text.length;
    const slice = text.slice(start, end).trim();
    if (slice) segments.push(slice);
  }

  return segments.length ? segments : [text];
}

function parseLeadingQuantity(raw: string) {
  const trimmed = raw.trim();
  const digitMatch = trimmed.match(/^(\d+)\b\s*(.*)$/);
  if (digitMatch) {
    const qty = Math.max(1, Number(digitMatch[1]));
    return { qty: Number.isFinite(qty) ? qty : 1, rest: digitMatch[2]?.trim() ?? "" };
  }

  const wordMatch = trimmed.match(/^([A-ZÀ-Ü]+)\b\s*(.*)$/i);
  if (wordMatch) {
    const word = wordMatch[1]?.toUpperCase() ?? "";
    const qty = WORD_NUMBER_MAP[word];
    if (qty) {
      return { qty, rest: wordMatch[2]?.trim() ?? "" };
    }
  }

  return { qty: 1, rest: trimmed };
}

export function segmentMagicInput(text: string): MagicSegment[] {
  if (!text.trim()) return [];

  const segments: MagicSegment[] = [];
  for (const part of splitStrong(text)) {
    for (const segment of splitNumberedList(part)) {
      const raw = segment.trim();
      if (!raw) continue;
      const { qty, rest } = parseLeadingQuantity(raw);
      const textNormalized = normalizeText(rest);
      segments.push({ raw, qty, textNormalized });
    }
  }

  return segments;
}
