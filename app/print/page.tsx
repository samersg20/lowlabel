"use client";

import { useEffect, useMemo, useState } from "react";
import { STORAGE_METHODS } from "@/lib/constants";

type Item = {
  id: string;
  name: string;
  methodQuente?: boolean;
  methodPistaFria?: boolean;
  methodDescongelando?: boolean;
  methodResfriado?: boolean;
  methodCongelado?: boolean;
  methodAmbienteSecos?: boolean;
};

export default function PrintPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [itemId, setItemId] = useState("");
  const [storageMethod, setStorageMethod] = useState("RESFRIADO");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        if (data[0]) setItemId(data[0].id);
      });
  }, []);

  const selectedItem = useMemo(() => items.find((i) => i.id === itemId), [items, itemId]);

  const availableMethods = useMemo(() => {
    if (!selectedItem) return [] as string[];
    return STORAGE_METHODS.filter((m) => {
      if (m === "QUENTE") return Boolean(selectedItem.methodQuente);
      if (m === "PISTA FRIA") return Boolean(selectedItem.methodPistaFria);
      if (m === "DESCONGELANDO") return Boolean(selectedItem.methodDescongelando);
      if (m === "RESFRIADO") return Boolean(selectedItem.methodResfriado);
      if (m === "CONGELADO") return Boolean(selectedItem.methodCongelado);
      if (m === "AMBIENTE SECOS") return Boolean(selectedItem.methodAmbienteSecos);
      return false;
    });
  }, [selectedItem]);

  useEffect(() => {
    if (!availableMethods.includes(storageMethod) && availableMethods[0]) {
      setStorageMethod(availableMethods[0]);
    }
  }, [availableMethods, storageMethod]);

  async function onPrint() {
    setError("");
    setMessage("");

    try {
      if (!storageMethod) throw new Error("Selecione um método válido para o item");

      const res = await fetch("/api/prints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, storageMethod, quantity }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na emissão");

      setMessage(`Etiqueta enviada ao PrintNode (${quantity}x). Jobs: ${data.jobIds?.join(", ") || "ok"}`);
    } catch (e: any) {
      setError(e.message || "Erro ao imprimir");
    }
  }

  return (
    <>
      <h1>Emitir Etiqueta</h1>
      <div className="card">
        <p style={{ marginTop: 0 }}>
          Integração ativa com <strong>PrintNode</strong>. Configure <code>PRINTNODE_API_KEY</code> e
          <code> PRINTNODE_PRINTER_ID</code> (ou <code>PRINTNODE_PRINT_ID</code>) no ambiente para impressão silenciosa.
        </p>
      </div>
      <div className="card grid grid-2">
        <label>
          Item
          <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>

        <label>
          Método
          <select value={storageMethod} onChange={(e) => setStorageMethod(e.target.value)}>
            {availableMethods.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>

        <label>
          Quantidade (1-50)
          <input type="number" min={1} max={50} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </label>

        <button type="button" onClick={onPrint}>IMPRIMIR</button>
      </div>

      {error && <div className="card" style={{ color: "#b00020" }}>{error}</div>}
      {message && <div className="card" style={{ color: "#0a7a00" }}>{message}</div>}
    </>
  );
}
