"use client";

import { useMemo, useState } from "react";

type SpeechRecognitionType = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionType;
    webkitSpeechRecognition?: new () => SpeechRecognitionType;
  }
}

export default function PrintVoicePage() {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canPrint, setCanPrint] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canRecord = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  function startVoiceCapture() {
    if (!canRecord) {
      setError("Seu navegador não suporta captação de voz.");
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.continuous = false;

    setError("");
    setListening(true);

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results || [])
        .map((result: any) => result?.[0]?.transcript || "")
        .join(" ")
        .trim();

      if (transcript) {
        setInput(transcript);
        void interpretTranscript(transcript);
      }
    };

    recognition.onerror = () => {
      setError("Não foi possível capturar o áudio. Tente novamente.");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  }

  async function interpretTranscript(text: string) {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/prints/voice/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Falha ao interpretar áudio");
      setInput(String(data.parsedText || text));
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
      <h1>Falar</h1>
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
          <button type="button" onClick={startVoiceCapture} disabled={!canRecord || listening || loading}>
            {listening ? "Ouvindo..." : "Gravar voz"}
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
