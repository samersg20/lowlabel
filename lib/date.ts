const SAO_PAULO_TZ = "America/Sao_Paulo";

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
