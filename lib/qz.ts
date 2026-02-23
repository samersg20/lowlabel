"use client";

declare global {
  interface Window {
    qz: any;
  }
}

const PREF_KEY = "safelabel_printer";
let securityConfigured = false;

function promiseFactory(resolver: (resolve: (value?: unknown) => void, reject: (reason?: unknown) => void) => void) {
  return new Promise(resolver);
}

async function configureQzSecurity(client: any) {
  if (securityConfigured) return;

  // QZ calls this as a function, not as `new Promise(...)`.
  // Passing Promise directly can throw: "Promise constructor cannot be invoked without 'new'".
  client.api.setPromiseType(promiseFactory);

  client.security.setCertificatePromise(async () => {
    const cert = await fetch("/qz/certificate.pem");
    if (!cert.ok) throw new Error("Falha ao carregar certificado QZ");
    return cert.text();
  });

  client.security.setSignatureAlgorithm("SHA256");
  client.security.setSignaturePromise(async (toSign: string) => {
    const res = await fetch("/api/qz/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: toSign }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Falha ao assinar payload QZ");
    }

    const data = await res.json();
    return data.signature;
  });

  securityConfigured = true;
}

export async function ensureQzConnected() {
  const client = window.qz;
  if (!client) {
    throw new Error("Biblioteca qz-tray não carregada. Verifique se o QZ Tray script foi carregado.");
  }

  await configureQzSecurity(client);

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
