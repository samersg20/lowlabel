"use client";

import { useRef, useState } from "react";

export default function PrintVoicePage() {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canPrint, setCanPrint] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startVoiceCapture() {
    setError("");

    if (listening) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        setListening(false);
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribeAndInterpret(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setListening(true);
    } catch {
      setError("Não foi possível acessar o microfone.");
    }
  }

  async function transcribeAndInterpret(blob: Blob) {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const form = new FormData();
      form.append("audio", new File([blob], "voice.webm", { type: "audio/webm" }));

      const transcribeRes = await fetch("/api/prints/voice/transcribe", {
        method: "POST",
        body: form,
      });
      const transcribeData = await transcribeRes.json().catch(() => ({}));
      if (!transcribeRes.ok) throw new Error(transcribeData.error || "Falha ao transcrever áudio");

      const text = String(transcribeData.text || "").trim();
      if (!text) throw new Error("Não foi possível identificar texto no áudio");

      const parseRes = await fetch("/api/prints/voice/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text }),
      });
      const parseData = await parseRes.json().catch(() => ({}));
      if (!parseRes.ok) throw new Error(parseData.error || "Falha ao interpretar áudio");

      setInput(String(parseData.parsedText || text));
      setCanPrint(true);
    } catch (e: any) {
      setError(e.message || "Erro no Falar");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/prints/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Falha ao emitir etiquetas");

      const lines = (data.results || []).map((r: any) => `${r.quantity}x ${r.itemName} (${r.method})`);
      setMessage(`OK, impresso: ${lines.join(" | ")}`);
      setInput("");
      setCanPrint(false);
    } catch (e: any) {
      setError(e.message || "Erro no Falar");
    } finally {
      setLoading(false);
    }
  }

  function onClear() {
    setInput("");
    setError("");
    setMessage("");
    setCanPrint(false);
  }

  return (
    <>
      <div className="card grid">
        <p style={{ margin: 0 }}>
          <span style={{ fontWeight: 700 }}>Fale seu pedido.</span><br />
          <span style={{ color: "#5b6774", fontSize: 13 }}>Vamos organizar em linhas (QTD / ITEM / MÉTODO).</span>
        </p>
        <textarea
          rows={6}
          placeholder="Ex.: 2 brisket 3 cupim 2 pork ribs"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setCanPrint(false);
          }}
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={startVoiceCapture} disabled={loading}>
            {listening ? "Parar gravação" : "Gravar voz"}
          </button>
          <button type="button" onClick={onSubmit} disabled={loading || !canPrint} className={!canPrint ? "secondary" : "print-submit"}>
            {loading ? "Processando..." : "Imprimir"}
          </button>
          <button type="button" className="secondary" onClick={onClear} disabled={loading}>
            Limpar
          </button>
        </div>
        <p style={{ margin: 0, color: "#5b6774", fontSize: 13 }}>
          Clique em gravar voz, se estiver de acordo com a sugestão clique Imprimir. Máximo 10 etiquetas por requisição.
        </p>
      </div>
      {error && <div className="card" style={{ color: "#b00020" }}>{error}</div>}
      {message && <div className="card" style={{ color: "#0a7a00" }}>{message}</div>}
    </>
  );
}
