"use client";

declare global {
  interface Window {
    qz: any;
  }
}

const PREF_KEY = "safelabel_printer";
let securityConfigured = false;

const QZ_CERTIFICATE_PEM = `-----BEGIN CERTIFICATE-----
MIIECzCCAvOgAwIBAgIGAZyMCVICMA0GCSqGSIb3DQEBCwUAMIGiMQswCQYDVQQG
EwJVUzELMAkGA1UECAwCTlkxEjAQBgNVBAcMCUNhbmFzdG90YTEbMBkGA1UECgwS
UVogSW5kdXN0cmllcywgTExDMRswGQYDVQQLDBJRWiBJbmR1c3RyaWVzLCBMTEMx
HDAaBgkqhkiG9w0BCQEWDXN1cHBvcnRAcXouaW8xGjAYBgNVBAMMEVFaIFRyYXkg
RGVtbyBDZXJ0MB4XDTI2MDIyMjE5NDU0N1oXDTQ2MDIyMjE5NDU0N1owgaIxCzAJ
BgNVBAYTAlVTMQswCQYDVQQIDAJOWTESMBAGA1UEBwwJQ2FuYXN0b3RhMRswGQYD
VQQKDBJRWiBJbmR1c3RyaWVzLCBMTEMxGzAZBgNVBAsMElFaIEluZHVzdHJpZXMs
IExMQzEcMBoGCSqGSIb3DQEJARYNc3VwcG9ydEBxei5pbzEaMBgGA1UEAwwRUVog
VHJheSBEZW1vIENlcnQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDf
plSXaLJA/r1MPFBgIA3PznKqbEJPeF2xTTbBsQJn+e+aPIFWarw569kJpQ8i/pqc
0WWUFQlFJUdos+jg+MNNWfcEUSLPSTB3ZZV56PxQ0OTPQDkd+7FwVbh5skfdkobr
adPpctXmWHcl9aO2DOUGkwCgzpE4+UeYYui2IaFJ5bqMYXVC9057b7Dg19RRGoS0
0e6TFPT+Owh5FeIijhlfGoww4ptMNjhkifGr0jYGEAwIrWZ+EKOo5IRx0o69qYiO
7jX1Yq79asOkAt401Mvqj9Kmey6VBoqoFvJGIO5H++dPMHIKjoN28PXA1Ejb581Z
UAwmHWtZH8BggPBR9RQdAgMBAAGjRTBDMBIGA1UdEwEB/wQIMAYBAf8CAQEwDgYD
VR0PAQH/BAQDAgEGMB0GA1UdDgQWBBSGFFN0A+1T/vWtNBBGT/9k35UPbjANBgkq
hkiG9w0BAQsFAAOCAQEANY9Y2g6ENmlUl40NgkmsjrZdYl66lmtaXDyeicAqbG1m
oH8tIcbAlCThQIl3kWmUQiyUrI/eVMHkFmU7abOSankw3GKV2IgAfgFPb167x15o
7GmGx30UblG43rJHlo0qG4bsVXlV3875bzGFkpOCu++DT5MykHQY+FdHRB3HvNLo
6Mnnt+GDQr/ZYB/57bsb+GZW3wNVdBRIn69rtLT4iCPJT/g1StqmoiAS/Q8OlW7k
cC8VJKqHJMEFMAKD807BX4JRmZx0EwSl6XsgSYA7C8kGR2Gb43Nd6XvU+2oKSYoB
sVtOMqiMxDGIkQvuCs8acWpaW7a8SP49MHz4L8LCgw==
-----END CERTIFICATE-----`;

function promiseFactory(resolver: (resolve: (value?: unknown) => void, reject: (reason?: unknown) => void) => void) {
  return new Promise(resolver);
}

async function configureQzSecurity(client: any) {
  if (securityConfigured) return;

  client.api.setPromiseType(promiseFactory);

  client.security.setCertificatePromise(async () => QZ_CERTIFICATE_PEM);

  client.security.setSignatureAlgorithm("SHA512");
  client.security.setSignaturePromise(async (toSign: string) => {
    const res = await fetch("/api/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: toSign }),
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
