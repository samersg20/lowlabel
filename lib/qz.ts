"use client";

declare global {
  interface Window {
    qz: any;
  }
}

const PREF_KEY = "safelabel_printer";

export async function ensureQzConnected() {
  const client = window.qz;
  if (!client) {
    throw new Error("Biblioteca qz-tray não carregada. Verifique se o QZ Tray script foi carregado.");
  }

  if (!client.websocket.isActive()) {
    await client.websocket.connect();
  }

  return client;
}

export async function listPrinters(): Promise<string[]> {
  const client = await ensureQzConnected();
  const printers = await client.printers.find();
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
  const client = await ensureQzConnected();
  const config = client.configs.create(printerName);
  await client.print(config, [{ type: "raw", format: "plain", data: zpl }]);
}
