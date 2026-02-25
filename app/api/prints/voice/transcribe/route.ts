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

    const normalizedKeyValues = [
      ["GROQ_API_KEY", process.env.GROQ_API_KEY],
      ["GROQ_APIKEY", process.env.GROQ_APIKEY],
      ["GROQ_VOICE_API_KEY", process.env.GROQ_VOICE_API_KEY],
    ] as const;

    const sanitizedValues = normalizedKeyValues
      .map(([name, value]) => [name, String(value || "").trim().replace(/^['\"]|['\"]$/g, "")] as const)
      .filter(([, value]) => Boolean(value));

    const orgId = String(process.env.GROQ_ORG_ID || "").trim();
    const gskEntry = sanitizedValues.find(([, value]) => /^gsk_/i.test(value));
    const apiKey = gskEntry?.[1] || "";

    if (!apiKey) {
      if (!sanitizedValues.length) {
        return NextResponse.json({ error: "Configure GROQ_API_KEY com uma chave Groq válida (prefixo gsk_)." }, { status: 500 });
      }

      const mistakenValue = sanitizedValues[0]?.[1] || "";
      if (mistakenValue === orgId || /^org_/i.test(mistakenValue)) {
        return NextResponse.json({ error: "Chave inválida: GROQ_ORG_ID identifica a organização e não funciona como API key. Gere uma chave em API Keys com prefixo gsk_." }, { status: 400 });
      }

      return NextResponse.json({ error: "Chave Groq inválida. Use GROQ_API_KEY com valor que comece com gsk_." }, { status: 400 });
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
