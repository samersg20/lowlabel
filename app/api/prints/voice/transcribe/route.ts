import { NextResponse } from "next/server";
import { requireTenantSession } from "@/lib/tenant";

const OPENAI_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";

export async function POST(req: Request) {
  try {
    const scoped = await requireTenantSession();
    if ("error" in scoped) return scoped.error;

    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo de áudio é obrigatório" }, { status: 400 });
    }

    const apiKey = String(process.env.OPENAI_API_KEY || "")
      .trim()
      .replace(/^['\"]|['\"]$/g, "");

    if (!apiKey) {
      return NextResponse.json({ error: "Configure OPENAI_API_KEY." }, { status: 500 });
    }

    const payload = new FormData();
    payload.set("file", file);
    payload.set("model", OPENAI_TRANSCRIBE_MODEL);
    payload.set("language", "pt");
    payload.set("response_format", "json");

    const openAiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: payload,
    });

    const data = await openAiRes.json().catch(() => ({}));
    if (!openAiRes.ok) {
      const message = String(data?.error?.message || "Falha na transcrição");
      if (openAiRes.status === 401 || /invalid api key/i.test(message)) {
        return NextResponse.json({ error: "Invalid API Key. Use uma OPENAI_API_KEY válida." }, { status: 401 });
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ text: String(data.text || "").trim(), model: OPENAI_TRANSCRIBE_MODEL });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Erro ao transcrever áudio" }, { status: 500 });
  }
}
