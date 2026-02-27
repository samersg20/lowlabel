const OPENAI_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";

export async function transcribeAudio(file: File) {
  const apiKey = String(process.env.OPENAI_API_KEY || "")
    .trim()
    .replace(/^['\"]|['\"]$/g, "");
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");

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
      throw new Error("Invalid API Key. Use uma OPENAI_API_KEY válida.");
    }
    throw new Error(message);
  }

  return String(data.text || "").trim();
}

export { OPENAI_TRANSCRIBE_MODEL };
