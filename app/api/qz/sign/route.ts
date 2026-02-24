import { NextResponse } from "next/server";
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function getPrivateKey() {
  if (process.env.QZ_PRIVATE_KEY_PEM) {
    return process.env.QZ_PRIVATE_KEY_PEM.replace(/\\n/g, "\n");
  }

  const filePath = join(process.cwd(), "qz-signing", "private-key.pem");
  return readFileSync(filePath, "utf8");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = String(body?.data ?? "");
    if (!data) return NextResponse.json({ error: "data required" }, { status: 400 });

    const signer = createSign("RSA-SHA256");
    signer.update(data);
    signer.end();

    const signature = signer.sign(getPrivateKey(), "base64");
    return NextResponse.json({ signature });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "sign failed" }, { status: 500 });
  }
}
