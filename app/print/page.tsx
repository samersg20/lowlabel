"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { STORAGE_METHODS } from "@/lib/constants";
import { getPreferredPrinter, listPrinters, printRawZpl, savePreferredPrinter } from "@/lib/qz";

type Item = { id: string; name: string };

export default function PrintPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [itemId, setItemId] = useState("");
  const [storageMethod, setStorageMethod] = useState("RESFRIADO");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [printer, setPrinter] = useState<string>("");
  const [printers, setPrinters] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/items").then((r) => r.json()).then((data) => {
      setItems(data);
      if (data[0]) setItemId(data[0].id);
    });
  }, []);

  async function detectPrinter() {
    try {
      const preferred = await getPreferredPrinter();
      const all = await listPrinters();
      setPrinters(all);
      if (preferred) setPrinter(preferred);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function onPrint() {
    setError("");
    setMessage("");
    try {
      if (!printer) {
        await detectPrinter();
        throw new Error("Selecione uma impressora antes de imprimir.");
      }

      const res = await fetch("/api/prints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, storageMethod, quantity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na emissão");

      for (let i = 0; i < quantity; i += 1) {
        await printRawZpl(printer, data.zpl);
      }
      setMessage(`Etiqueta enviada (${quantity}x) para ${printer}`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <>
      <Script src="http://localhost:8181/qz-tray.js" strategy="afterInteractive" />
      <h1>Emitir Etiqueta</h1>
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
            {STORAGE_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label>
          Quantidade (1-50)
          <input type="number" min={1} max={50} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </label>
        <div>
          <button type="button" className="secondary" onClick={detectPrinter}>Detectar impressora</button>
          {printers.length > 0 && (
            <select value={printer} onChange={(e) => { setPrinter(e.target.value); savePreferredPrinter(e.target.value); }}>
              <option value="">Selecione impressora</option>
              {printers.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          <div style={{ fontSize: 12, marginTop: 6 }}>Selecionada: {printer || "nenhuma"}</div>
        </div>
        <button type="button" onClick={onPrint}>IMPRIMIR</button>
      </div>
      {error && <div className="card" style={{ color: "#b00020" }}>{error}</div>}
      {message && <div className="card" style={{ color: "#0a7a00" }}>{message}</div>}
    </>
  );
}
