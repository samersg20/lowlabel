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

    const apiKey = String(
      process.env.GROQ_API_KEY || process.env.GROQ_APIKEY || process.env.GROQ_VOICE_API_KEY || "",
    )
      .trim()
      .replace(/^['\"]|['\"]$/g, "");
    const orgId = String(process.env.GROQ_ORG_ID || "").trim();

    if (!apiKey) {
      return NextResponse.json({ error: "Configure GROQ_API_KEY (fallback: GROQ_APIKEY ou GROQ_VOICE_API_KEY)." }, { status: 500 });
    }

    if (apiKey === orgId || /^org_/i.test(apiKey)) {
      return NextResponse.json({ error: "Chave inválida: GROQ_ORG_ID identifica a organização e não funciona como API key. Gere uma chave em API Keys com prefixo gsk_." }, { status: 400 });
    }

    if (!/^gsk_/i.test(apiKey)) {
      return NextResponse.json({ error: "Chave Groq inválida. A API key deve começar com 'gsk_' (sem espaços)." }, { status: 400 });
    }

    const transcriptionModel = "whisper-large-v3-turbo";

    const payload = new FormData();
    payload.set("file", file);
    payload.set("model", transcriptionModel);
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
        return NextResponse.json({ error: "Invalid API Key. Use GROQ_API_KEY válida (prefixo gsk_). GROQ_ORG_ID não é chave de API." }, { status: 401 });
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ text: String(data.text || "").trim(), model: transcriptionModel });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Erro ao transcrever áudio" }, { status: 500 });
  }
}
