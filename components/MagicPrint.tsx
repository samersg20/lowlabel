"use client";

import { useEffect, useRef, useState } from "react";

type Result = { itemName: string; quantity: number; method: string; jobIds: number[] };

export default function MagicPrint() {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  async function startRecording() {
    setError("");
    setStatus("");
    setResults([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        void transcribeAudio(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err: any) {
      setError(err?.message || "Falha ao acessar o microfone");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function transcribeAudio(blob: Blob) {
    setTranscribing(true);
    setStatus("Transcrevendo áudio...");
    setError("");
    try {
      const form = new FormData();
      form.set("audio", blob, "audio.webm");

      const res = await fetch("/api/prints/magic/transcribe", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Falha ao transcrever áudio");
        setStatus("");
        return;
      }

      const nextText = String(data.text || "").trim();
      if (nextText) {
        setText(nextText);
        setStatus("Transcrição pronta. Revise o texto e clique em Imprimir.");
      } else {
        setStatus("Transcrição vazia. Tente novamente.");
      }
    } catch (err: any) {
      setError(err?.message || "Falha ao transcrever áudio");
      setStatus("");
    } finally {
      setTranscribing(false);
    }
  }

  async function onPrint() {
    setError("");
    setResults([]);
    setLoading(true);
    try {
      const trimmed = text.trim();
      if (!trimmed) {
        setError("Digite ou transcreva um texto antes de imprimir");
        return;
      }

      const res = await fetch("/api/prints/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Falha ao imprimir");
        return;
      }
      setResults(data.results || []);
      if (data.text && !text.trim()) setText(data.text);
    } catch (err: any) {
      setError(err?.message || "Falha ao imprimir");
    } finally {
      setLoading(false);
    }
  }

  function onClear() {
    setText("");
    setAudioBlob(null);
    setResults([]);
    setError("");
    setStatus("");
  }

  const canPrint = Boolean(text.trim());

  return (
    <>
      <div className="card">
        <label>Texto</label>
        <textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex.: 10 brisket 5 cupim 2 pork ribs"
        />
        <div className="print-actions-row" style={{ marginTop: 12, gap: 12 }}>
          <button type="button" onClick={recording ? stopRecording : startRecording} className="secondary" disabled={transcribing || loading}>
            {recording ? "Parar" : "Gravar"}
          </button>
          <button type="button" onClick={onPrint} disabled={!canPrint || loading || transcribing} className={!canPrint ? "secondary" : "print-submit"}>
            {loading ? "Imprimindo..." : "Imprimir"}
          </button>
          <button type="button" onClick={onClear} className="secondary" disabled={loading || transcribing}>
            Limpar
          </button>
        </div>
        {recording && <p style={{ marginTop: 8 }}>Gravação em andamento...</p>}
        {audioBlob && !recording && !transcribing && <p style={{ marginTop: 8 }}>Áudio capturado.</p>}
        {status && <p style={{ marginTop: 8 }}>{status}</p>}
        {error && <p style={{ color: "#b00020", marginTop: 8 }}>{error}</p>}
      </div>

      {results.length > 0 && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Método</th>
                <th>Quantidade</th>
                <th>Jobs</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={`${row.itemName}-${row.method}`}>
                  <td>{row.itemName}</td>
                  <td>{row.method}</td>
                  <td>{row.quantity}</td>
                  <td>{row.jobIds?.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
