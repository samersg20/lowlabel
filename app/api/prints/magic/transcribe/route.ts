import { NextResponse } from "next/server";
import { withTenantTx } from "@/lib/tenant-tx";
import { transcribeAudio } from "@/lib/openai-transcribe";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function json(data: any, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...JSON_HEADERS, ...(init?.headers || {}) },
  });
}

export async function POST(req: Request) {
  try {
    return await withTenantTx(req, async () => {
      const form = await req.formData();
      const audioField = form.get("audio");
      if (!(audioField instanceof File)) {
        return json({ error: "Arquivo de áudio é obrigatório" }, { status: 400 });
      }

      const text = await transcribeAudio(audioField);
      return json({ text });
    });
  } catch (error: any) {
    return json({ error: error?.message || "Erro ao transcrever áudio" }, { status: 500 });
  }
}
