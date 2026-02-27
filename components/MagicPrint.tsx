"use client";

import { useEffect, useRef, useState } from "react";

type PrintedResult = { itemName: string; quantity: number; method: string; jobIds: number[] };

type PreviewCard = {
  id: string;
  itemId?: string;
  itemName: string;
  quantity: number;
  confidence: number;
  badge: "high" | "medium" | "low";
  status: "ok" | "unknown";
};

type MagicPrintProps = { unitId?: string };

const BADGE_LABELS: Record<PreviewCard["badge"], string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const BADGE_COLORS: Record<PreviewCard["badge"], string> = {
  high: "#0a7a00",
  medium: "#b07b00",
  low: "#b00020",
};

export default function MagicPrint({ unitId }: MagicPrintProps) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [pendingTranscript, setPendingTranscript] = useState("");
  const [lastEditedAt, setLastEditedAt] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [cards, setCards] = useState<PreviewCard[]>([]);
  const [printed, setPrinted] = useState<PrintedResult[]>([]);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
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

  const hasMediumOrLow = cards.some((card) => card.badge !== "high" || card.status === "unknown");
  const hasUnknown = cards.some((card) => card.status === "unknown");

  async function startRecording() {
    setError("");
    setWarning("");
    setStatus("");
    setPrinted([]);
    setCards([]);
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
        setStatus("Transcrição concluída. Clique em Gerar Etiquetas.");
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

  async function runPreview(input: string) {
    setError("");
    setStatus("");
    setWarning("");
    setPreviewLoading(true);
    setCards([]);
    setPrinted([]);
    try {
      const fallback = pendingTranscript.trim();
      const resolvedInput = input.trim() || fallback;
      const trimmed = resolvedInput.trim();
      if (!trimmed) {
        setError("Digite ou transcreva um texto antes de gerar as etiquetas");
        return;
      }
      if (!unitId) {
        setError("Unidade inválida");
        return;
      }
      if (!input.trim() && fallback) {
        setText(fallback);
        setPendingTranscript("");
      }

      const res = await fetch("/api/prints/magic/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, unitId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Não foi possível gerar a prévia");
        return;
      }

      setCards(Array.isArray(data.cards) ? data.cards : []);
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
    if (!unitId) {
      setError("Unidade inválida");
      return;
    }
    if (!cards.length) {
      setError("Gere as etiquetas antes de imprimir");
      return;
    }
    if (hasUnknown) {
      setError("Remova os itens desconhecidos antes de imprimir");
      return;
    }

    const payloadCards = cards
      .filter((card) => card.status === "ok" && card.itemId)
      .map((card) => ({ itemId: card.itemId as string, quantity: card.quantity }));

    if (!payloadCards.length) {
      setError("Nenhum item válido para imprimir");
      return;
    }

    setPrinting(true);
    try {
      const res = await fetch("/api/prints/magic/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId, cards: payloadCards }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Falha ao imprimir");
        return;
      }

      setPrinted(data.printed || []);
      setStatus("Impressão enviada.");
    } catch (err: any) {
      setError(err?.message || "Falha ao imprimir");
    } finally {
      setPrinting(false);
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
    setCards([]);
  }

  function removeCard(id: string) {
    setCards((prev) => prev.filter((card) => card.id !== id));
  }

  function adjustQty(id: string, delta: number) {
    setCards((prev) =>
      prev.map((card) => {
        if (card.id !== id) return card;
        const nextQty = Math.max(1, card.quantity + delta);
        return { ...card, quantity: nextQty };
      }),
    );
  }

  const canGenerate = Boolean(text.trim() || pendingTranscript.trim());
  const canPrint = cards.length > 0 && !printing && !transcribing && !previewLoading;

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
            setCards([]);
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
              disabled={transcribing || printing}
              aria-label={recording ? "Parar gravação" : "Iniciar gravação"}
            >
              {recording ? "Parar" : "Gravar"}
            </button>
            <button
              type="button"
              onClick={() => runPreview(text)}
              disabled={!canGenerate || previewLoading || printing || transcribing}
              className="secondary"
              aria-label="Gerar etiquetas"
            >
              {previewLoading ? "Gerando etiquetas..." : "Gerar Etiquetas"}
            </button>
            <button
              type="button"
              onClick={onPrint}
              disabled={!canPrint}
              className={!canPrint ? "secondary" : "print-submit"}
              aria-label="Imprimir etiquetas"
            >
              {printing ? "Imprimindo..." : "Imprimir Tudo"}
            </button>
            <button type="button" onClick={onClear} className="secondary" disabled={printing || transcribing} aria-label="Limpar formulário">
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

      {cards.length > 0 && (
        <div className="card">
          {hasMediumOrLow && (
            <p style={{ color: "#b07b00", marginTop: 0 }}>
              Alguns itens podem não ter sido reconhecidos com total precisão. Revise antes de imprimir.
            </p>
          )}
          <div style={{ display: "grid", gap: 12 }}>
            {cards.map((card) => (
              <div
                key={card.id}
                style={{
                  border: "1px solid #d8e0e8",
                  borderRadius: 10,
                  padding: 12,
                  background: card.badge === "high" ? "#fff" : "rgba(255, 215, 100, 0.2)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{card.itemName}</div>
                    <div style={{ color: card.status === "unknown" ? "#b00020" : BADGE_COLORS[card.badge] }}>
                      {card.status === "unknown" ? "Item desconhecido" : `Confiança ${BADGE_LABELS[card.badge]}`}
                    </div>
                  </div>
                  <button type="button" className="secondary" onClick={() => removeCard(card.id)} disabled={printing || previewLoading} aria-label="Remover item">
                    X
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <button type="button" className="secondary" onClick={() => adjustQty(card.id, -1)} disabled={printing || previewLoading || card.quantity <= 1}>
                    -
                  </button>
                  <div style={{ minWidth: 40, textAlign: "center", fontWeight: 700 }}>{card.quantity}</div>
                  <button type="button" className="secondary" onClick={() => adjustQty(card.id, 1)} disabled={printing || previewLoading}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
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
