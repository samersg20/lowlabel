"use client";

import { useEffect, useRef, useState } from "react";

type PrintedResult = { itemName: string; quantity: number; method: string; jobIds: number[] };
type SegmentPreview = {
  index: number;
  raw: string;
  qty: number;
  textNormalized: string;
  resolved?: { itemId?: string; itemName?: string; confidence: number };
};
type FailedPreview = {
  index: number;
  raw: string;
  qty: number;
  textNormalized: string;
  confidence: number;
  topCandidates: Array<{ id: string; name: string; score: number }>;
};

export default function MagicPrint() {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewOk, setPreviewOk] = useState(false);
  const [previewSegments, setPreviewSegments] = useState<SegmentPreview[]>([]);
  const [failedSegments, setFailedSegments] = useState<FailedPreview[]>([]);
  const [printed, setPrinted] = useState<PrintedResult[]>([]);
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
    setPrinted([]);
    setPreviewOk(false);
    setPreviewSegments([]);
    setFailedSegments([]);
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
        setStatus("Transcrição pronta. Gerando prévia...");
        await runPreflight(nextText);
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

  async function runPreflight(input: string) {
    setError("");
    setStatus("");
    setPreviewLoading(true);
    setPreviewOk(false);
    setFailedSegments([]);
    setPreviewSegments([]);
    setPrinted([]);
    try {
      const trimmed = input.trim();
      if (!trimmed) {
        setError("Digite ou transcreva um texto antes de gerar a prévia");
        return;
      }

      const res = await fetch("/api/prints/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, preflight: true }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setPreviewOk(false);
        setPreviewSegments(data.segments || []);
        setFailedSegments(data.failed || []);
        setError(data.error || (data.reason === "LOW_CONFIDENCE" ? "Baixa confiança em um ou mais itens." : "Não foi possível gerar a prévia"));
        return;
      }

      setPreviewOk(true);
      setPreviewSegments(data.segments || []);
      setStatus("Prévia pronta. Verifique os itens e clique em Imprimir.");
    } catch (err: any) {
      setError(err?.message || "Falha ao gerar a prévia");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function onPrint() {
    setError("");
    setPrinted([]);
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
        body: JSON.stringify({ text: trimmed, preflight: false }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setPreviewOk(false);
        setPreviewSegments(data.segments || []);
        setFailedSegments(data.failed || []);
        setError(data.error || (data.reason === "LOW_CONFIDENCE" ? "Baixa confiança em um ou mais itens." : "Falha ao imprimir"));
        return;
      }
      setPreviewOk(true);
      setPreviewSegments(data.segments || []);
      setPrinted(data.printed || []);
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
    setPrinted([]);
    setError("");
    setStatus("");
    setPreviewOk(false);
    setPreviewSegments([]);
    setFailedSegments([]);
  }

  const canPrint = previewOk && previewSegments.length > 0;

  return (
    <>
      <div className="card">
        <label>Texto</label>
        <textarea
          rows={6}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreviewOk(false);
            setPreviewSegments([]);
            setFailedSegments([]);
            setPrinted([]);
          }}
          placeholder="Ex.: 10 brisket 5 cupim 2 pork ribs"
        />
        <div className="print-actions-row" style={{ marginTop: 12, gap: 12 }}>
          <button type="button" onClick={recording ? stopRecording : startRecording} className="secondary" disabled={transcribing || loading}>
            {recording ? "Parar" : "Gravar"}
          </button>
          <button type="button" onClick={() => runPreflight(text)} disabled={previewLoading || loading || transcribing} className="secondary">
            {previewLoading ? "Gerando prévia..." : "Prévia"}
          </button>
          <button type="button" onClick={onPrint} disabled={!canPrint || loading || transcribing || previewLoading} className={!canPrint ? "secondary" : "print-submit"}>
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

      {previewSegments.length > 0 && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Segmento</th>
                <th>Item</th>
                <th>Quantidade</th>
                <th>Confiança</th>
              </tr>
            </thead>
            <tbody>
              {previewSegments.map((segment) => (
                <tr key={`${segment.index}-${segment.raw}`}>
                  <td>{segment.raw}</td>
                  <td>{segment.resolved?.itemName || "Não reconhecido"}</td>
                  <td>{segment.qty}</td>
                  <td>{segment.resolved?.confidence?.toFixed?.(2) ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {failedSegments.length > 0 && (
        <div className="card">
          <p style={{ marginBottom: 8 }}>Itens com baixa confiança. Ajuste o texto ou escolha um candidato.</p>
          {failedSegments.map((failed) => (
            <div key={`${failed.index}-${failed.raw}`} style={{ marginBottom: 12 }}>
              <strong>{failed.raw}</strong>
              <div>Confiança: {failed.confidence.toFixed(2)}</div>
              {failed.topCandidates?.length ? (
                <div>Top candidatos: {failed.topCandidates.map((candidate) => `${candidate.name} (${candidate.score.toFixed(2)})`).join(", ")}</div>
              ) : (
                <div>Sem candidatos relevantes.</div>
              )}
            </div>
          ))}
        </div>
      )}

      {printed.length > 0 && (
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
              {printed.map((row) => (
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
