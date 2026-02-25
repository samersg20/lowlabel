import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo de áudio é obrigatório" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_APIKEY || process.env.GROQ_VOICE_API_KEY || "";
    const orgId = process.env.GROQ_ORG_ID || "";

    if (!apiKey) {
      return NextResponse.json({ error: "Configure GROQ_API_KEY (não use GROQ_ORG_ID como chave da API)." }, { status: 500 });
    }

    if (apiKey === orgId || /^org_/i.test(apiKey)) {
      return NextResponse.json({ error: "Chave inválida: GROQ_ORG_ID identifica a organização e não funciona como API key. Use GROQ_API_KEY." }, { status: 400 });
    }

    const payload = new FormData();
    payload.set("file", file);
    payload.set("model", "whisper-large-v3-turbo");
    payload.set("language", "pt");
    payload.set("response_format", "json");

    const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: payload,
    });

    const data = await groqRes.json().catch(() => ({}));
    if (!groqRes.ok) {
      const message = String(data?.error?.message || "Falha na transcrição");
      if (groqRes.status === 401 || /invalid api key/i.test(message)) {
        return NextResponse.json({ error: "Invalid API Key. Use GROQ_API_KEY válida (GROQ_ORG_ID não é chave de API)." }, { status: 401 });
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ text: String(data.text || "").trim(), model: "whisper-large-v3-turbo" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Erro ao transcrever áudio" }, { status: 500 });
  }
}
