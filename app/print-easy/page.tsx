"use client";

import { useState } from "react";

export default function PrintEasyPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [canPrint, setCanPrint] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onInterpret() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/prints/easy/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Falha ao interpretar");
      setInput(String(data.parsedText || input));
      setCanPrint(true);
    } catch (e: any) {
      setError(e.message || "Erro no Digitar");
    } finally {
      setLoading(false);
    }
  }

  async function onPrint() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/prints/easy", {
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
      setError(e.message || "Erro no Digitar");
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
          <span style={{ fontWeight: 700 }}>Escreva seu pedido.</span><br />
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
          <button type="button" onClick={onInterpret} disabled={loading || !input.trim()}>
            {loading ? "Processando..." : "Processar"}
          </button>
          <button type="button" onClick={onPrint} disabled={loading || !canPrint} className={!canPrint ? "secondary" : "print-submit"}>
            {loading ? "Processando..." : "Imprimir"}
          </button>
          <button type="button" className="secondary" onClick={onClear} disabled={loading}>
            Limpar
          </button>
        </div>
        <p style={{ margin: 0, color: "#5b6774", fontSize: 13 }}>
          Após escrever clique em Processar, se estiver de acordo com a sugestão clique Imprimir. Máximo 10 etiquetas por requisição.
        </p>
      </div>
      {error && <div className="card" style={{ color: "#b00020" }}>{error}</div>}
      {message && <div className="card" style={{ color: "#0a7a00" }}>{message}</div>}
    </>
  );
}
