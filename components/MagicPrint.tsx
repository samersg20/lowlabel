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
type PreviewItem = {
  itemId: string;
  itemName: string;
  quantity: number;
  confidence: number;
};

export default function MagicPrint() {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [pendingTranscript, setPendingTranscript] = useState("");
  const [lastEditedAt, setLastEditedAt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewOk, setPreviewOk] = useState(false);
  const [blockedByConfidence, setBlockedByConfidence] = useState(false);
  const [previewSegments, setPreviewSegments] = useState<SegmentPreview[]>([]);
  const [failedSegments, setFailedSegments] = useState<FailedPreview[]>([]);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [printed, setPrinted] = useState<PrintedResult[]>([]);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [status, setStatus] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const AUTO_PRINT_THRESHOLD = 0.85;

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  async function startRecording() {
    setError("");
    setWarning("");
    setStatus("");
    setPrinted([]);
    setPreviewOk(false);
    setBlockedByConfidence(false);
    setPreviewSegments([]);
    setFailedSegments([]);
    setPreviewItems([]);
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
    setWarning("");
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
        const now = Date.now();
        const shouldReplace = !text.trim() || now - lastEditedAt > 8000;
        if (shouldReplace) {
          setText(nextText);
          setPendingTranscript("");
        } else {
          const confirmed = window.confirm("Substituir o texto pelo áudio transcrito?");
          if (confirmed) {
            setText(nextText);
            setPendingTranscript("");
          } else {
            setPendingTranscript(nextText);
          }
        }
        setStatus("Transcrição concluída. Clique em Gerar prévia.");
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
    setBlockedByConfidence(false);
    setFailedSegments([]);
    setPreviewSegments([]);
    setPreviewItems([]);
    setPrinted([]);
    try {
      const fallback = pendingTranscript.trim();
      const resolvedInput = input.trim() || fallback;
      const trimmed = resolvedInput.trim();
      if (!trimmed) {
        setError("Digite ou transcreva um texto antes de gerar a prévia");
        return;
      }
      if (!input.trim() && fallback) {
        setText(fallback);
        setPendingTranscript("");
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
        setPreviewItems(data.previewItems || []);
        if (data.reason === "LOW_CONFIDENCE") {
          setWarning("Verifique os itens destacados antes de imprimir.");
        } else {
          setError(data.error || "Não foi possível gerar a prévia");
        }
        return;
      }

      setPreviewOk(true);
      setPreviewSegments(data.segments || []);
      setPreviewItems(data.previewItems || []);
      setBlockedByConfidence(Boolean(data.suggested));
      setWarning(data.suggested ? "Verifique os itens destacados antes de imprimir." : "");
      setStatus("Prévia pronta. Revise os itens antes de imprimir.");
    } catch (err: any) {
      setError(err?.message || "Falha ao gerar a prévia");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function onPrint() {
    setError("");
    setWarning("");
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
        setPreviewItems(data.previewItems || []);
        if (data.reason === "LOW_CONFIDENCE") {
          setWarning("Verifique os itens destacados antes de imprimir.");
        } else {
          setError(data.error || "Falha ao imprimir");
        }
        return;
      }
      setPreviewOk(true);
      setPreviewSegments(data.segments || []);
      setPreviewItems(data.previewItems || []);
      setBlockedByConfidence(Boolean(data.suggested));
      setWarning(data.suggested ? "Verifique os itens destacados antes de imprimir." : "");
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
    setPendingTranscript("");
    setPrinted([]);
    setError("");
    setWarning("");
    setStatus("");
    setPreviewOk(false);
    setBlockedByConfidence(false);
    setPreviewSegments([]);
    setFailedSegments([]);
    setPreviewItems([]);
  }

  const canPrint = previewOk && previewItems.length > 0 && !blockedByConfidence;
  const canPreflight = Boolean(text.trim() || pendingTranscript.trim());

  return (
    <>
      <div className="card">
        <label>Pedido (digite ou fale)</label>
        <textarea
          rows={6}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setLastEditedAt(Date.now());
            setPreviewOk(false);
            setBlockedByConfidence(false);
            setPreviewSegments([]);
            setFailedSegments([]);
            setPreviewItems([]);
            setPrinted([]);
          }}
          placeholder="Ex.: 10 brisket 5 cupim 2 pork ribs"
        />
        <div style={{ marginTop: 16, borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 12 }}>
          <p style={{ marginBottom: 8 }}>Ou use a voz:</p>
          <div className="print-actions-row" style={{ gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className="secondary"
              disabled={transcribing || loading}
              aria-label={recording ? "Parar gravação" : "Iniciar gravação"}
            >
              {recording ? "Parar" : "Gravar"}
            </button>
            <button
              type="button"
              onClick={() => runPreflight(text)}
              disabled={!canPreflight || previewLoading || loading || transcribing}
              className="secondary"
              aria-label="Gerar prévia do pedido"
            >
              {previewLoading ? "Gerando prévia..." : "Gerar prévia"}
            </button>
            <button
              type="button"
              onClick={onPrint}
              disabled={!canPrint || loading || transcribing || previewLoading}
              className={!canPrint ? "secondary" : "print-submit"}
              aria-label="Imprimir etiquetas"
            >
              {loading ? "Imprimindo..." : "Imprimir"}
            </button>
            <button type="button" onClick={onClear} className="secondary" disabled={loading || transcribing} aria-label="Limpar formulário">
              Limpar
            </button>
          </div>
        </div>
        {recording && <p style={{ marginTop: 8 }}>Gravação em andamento...</p>}
        {audioBlob && !recording && !transcribing && <p style={{ marginTop: 8 }}>Áudio capturado.</p>}
        {status && <p style={{ marginTop: 8 }}>{status}</p>}
        {warning && <p style={{ color: "#b07b00", marginTop: 8 }}>{warning}</p>}
        {error && <p style={{ color: "#b00020", marginTop: 8 }}>{error}</p>}
      </div>

      {previewItems.length > 0 && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantidade</th>
                <th>Confiança</th>
              </tr>
            </thead>
            <tbody>
              {previewItems.map((item) => (
                <tr key={item.itemId} style={item.confidence < AUTO_PRINT_THRESHOLD ? { background: "rgba(255, 215, 100, 0.3)" } : undefined}>
                  <td>{item.itemName}</td>
                  <td>{item.quantity}</td>
                  <td>{item.confidence.toFixed(2)}{item.confidence < AUTO_PRINT_THRESHOLD ? " • Atenção" : ""}</td>
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
