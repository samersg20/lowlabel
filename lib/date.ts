const SAO_PAULO_TZ = "America/Sao_Paulo";
const SAO_PAULO_OFFSET_MINUTES = -3 * 60;

type DateParts = { year: number; month: number; day: number };

function dateInSaoPaulo(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseDateKey(dateKey: string): DateParts {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

function saoPauloDateTimeToUtc(dateKey: string, hh: number, mm: number, ss: number, ms = 0) {
  const { year, month, day } = parseDateKey(dateKey);
  const utcMillis = Date.UTC(year, month - 1, day, hh, mm, ss, ms) - SAO_PAULO_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMillis);
}

export function nowInSaoPauloDateKey(now = new Date()) {
  return dateInSaoPaulo(now);
}

export function getSaoPauloDayRange(dateKey: string) {
  return {
    start: saoPauloDateTimeToUtc(dateKey, 0, 0, 0, 0),
    end: saoPauloDateTimeToUtc(dateKey, 23, 59, 59, 999),
  };
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const { year, month, day } = parseDateKey(dateKey);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatDateTime(dt: Date | string): string {
  const d = typeof dt === "string" ? new Date(dt) : dt;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
