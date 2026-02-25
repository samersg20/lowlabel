const PRINTNODE_API_BASE = "https://api.printnode.com";

type PrintNodeConfig = {
  apiKey: string;
  printerId: number;
};

function normalizeConfig(input: { apiKey?: string | null; printerId?: number | string | null }) {
  const apiKey = String(input.apiKey ?? "").trim();
  const printerId = Number(input.printerId);

  if (!apiKey) {
    throw new Error("PRINTNODE_API_KEY não configurada");
  }

  if (!Number.isInteger(printerId) || printerId <= 0) {
    throw new Error("PRINTNODE_PRINTER_ID/PRINTNODE_PRINT_ID inválido");
  }

  return { apiKey, printerId };
}

function getPrintNodeConfigFromEnv(): PrintNodeConfig {
  return normalizeConfig({
    apiKey: process.env.PRINTNODE_API_KEY,
    printerId: process.env.PRINTNODE_PRINTER_ID ?? process.env.PRINTNODE_PRINT_ID,
  });
}

function makeBasicAuth(apiKey: string) {
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

export async function submitRawZplToPrintNode(
  zpl: string,
  quantity: number,
  title: string,
  configOverride?: { apiKey?: string | null; printerId?: number | string | null },
) {
  const { apiKey, printerId } = configOverride ? normalizeConfig(configOverride) : getPrintNodeConfigFromEnv();

  const content = Buffer.from(zpl, "utf8").toString("base64");
  const authHeader = makeBasicAuth(apiKey);
  const jobIds: number[] = [];

  for (let i = 0; i < quantity; i += 1) {
    const res = await fetch(`${PRINTNODE_API_BASE}/printjobs`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId,
        title,
        contentType: "raw_base64",
        content,
        source: "Etiketi",
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`PrintNode erro (${res.status}): ${body || "falha ao criar printjob"}`);
    }

    const createdId = await res.json();
    jobIds.push(Number(createdId));
  }

  return jobIds;
}
