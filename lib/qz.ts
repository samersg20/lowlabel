"use client";

declare global {
  interface Window {
    qz: any;
  }
}

const PREF_KEY = "safelabel_printer";

export async function ensureQzConnected() {
  const qz = window.qz;
  if (!qz) throw new Error("QZ Tray não encontrado. Instale e inicie o QZ Tray.");
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }
  return qz;
}

export async function listPrinters(): Promise<string[]> {
  const qz = await ensureQzConnected();
  const printers = await qz.printers.find();
  return Array.isArray(printers) ? printers : [printers];
}

export async function getPreferredPrinter(): Promise<string | null> {
  const printers = await listPrinters();
  const saved = localStorage.getItem(PREF_KEY);
  if (saved && printers.includes(saved)) return saved;

  const auto = printers.find((p) => p.includes("ZDesigner ZD220"));
  if (auto) {
    localStorage.setItem(PREF_KEY, auto);
    return auto;
  }

  return null;
}

export function savePreferredPrinter(printer: string) {
  localStorage.setItem(PREF_KEY, printer);
}

export async function printRawZpl(printerName: string, zpl: string) {
  const qz = await ensureQzConnected();
  const config = qz.configs.create(printerName);
  await qz.print(config, [{ type: "raw", format: "plain", data: zpl }]);
}
