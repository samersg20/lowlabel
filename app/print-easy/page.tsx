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
    } catch (e: any) {
      setError(e.message || "Erro no emitir fácil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1>Emitir Fácil</h1>
      <div className="card grid">
        <label>
          Pedido em texto corrido
          <textarea
            rows={6}
            placeholder="Ex.: 10 brisket 5 cupim 2 pork ribs"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        <button type="button" onClick={onSubmit} disabled={loading || !input.trim()}>
          {loading ? "Processando..." : "Interpretar e Imprimir"}
        </button>
      </div>
      {error && <div className="card" style={{ color: "#b00020" }}>{error}</div>}
      {message && <div className="card" style={{ color: "#0a7a00" }}>{message}</div>}
    </>
  );
}
