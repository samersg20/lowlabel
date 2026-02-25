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

    const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_APIKEY || process.env.GROQ_VOICE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY não configurada (ou GROQ_APIKEY/GROQ_VOICE_API_KEY)" }, { status: 500 });
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
    if (!groqRes.ok) return NextResponse.json({ error: data?.error?.message || "Falha na transcrição" }, { status: 400 });

    return NextResponse.json({ text: String(data.text || "").trim(), model: "whisper-large-v3-turbo" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Erro ao transcrever áudio" }, { status: 500 });
  }
}
