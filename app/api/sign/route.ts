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

function getRequestToSign(req: Request, body: any): string {
  const queryValue = new URL(req.url).searchParams.get("request");
  if (queryValue) return queryValue;

  const bodyValue = body?.request;
  if (typeof bodyValue === "string" && bodyValue.length > 0) return bodyValue;

  return "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestToSign = getRequestToSign(req, body);

    if (!requestToSign) {
      return NextResponse.json({ error: "request parameter is required" }, { status: 400 });
    }

    const signer = createSign("RSA-SHA512");
    signer.update(requestToSign, "utf8");
    signer.end();

    const signature = signer.sign(getPrivateKey(), "base64");
    return NextResponse.json({ signature });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "sign failed" }, { status: 500 });
  }
}
