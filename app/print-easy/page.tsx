"use client";

import { useState } from "react";

export default function PrintEasyPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit() {
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
  }

  return (
    <>
      <h1>Digitar</h1>
      <div className="card grid">
        <label>
          Pedido em texto corrido (máximo de 10 etiquetas por item)
          <textarea
            rows={6}
            placeholder="Ex.: 10 brisket 5 cupim 2 pork ribs"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={onSubmit} disabled={loading || !input.trim()}>
            {loading ? "Processando..." : "Interpretar e Imprimir"}
          </button>
          <button type="button" className="secondary" onClick={onClear} disabled={loading}>
            Limpar
          </button>
        </div>
      </div>
      {error && <div className="card" style={{ color: "#b00020" }}>{error}</div>}
      {message && <div className="card" style={{ color: "#0a7a00" }}>{message}</div>}
    </>
  );
}
