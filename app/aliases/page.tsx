"use client";

import { useEffect, useState } from "react";

type AliasRow = {
  id: string;
  alias: string;
  createdAt: string;
  item: { id: string; name: string };
};

type Item = { id: string; name: string };

export default function AliasesPage() {
  const [rows, setRows] = useState<AliasRow[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [alias, setAlias] = useState("");
  const [itemId, setItemId] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [aliasesRes, itemsRes] = await Promise.all([fetch("/api/aliases"), fetch("/api/items")]);
    const aliases = await aliasesRes.json().catch(() => []);
    const itemsData = await itemsRes.json().catch(() => []);
    setRows(Array.isArray(aliases) ? aliases : []);
    setItems(Array.isArray(itemsData) ? itemsData : []);
    if (!itemId && itemsData?.[0]?.id) setItemId(itemsData[0].id);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/aliases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias, itemId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Erro ao salvar alias");
      return;
    }
    setAlias("");
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/aliases/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <>
      <h1>Aliases de Itens</h1>
      <div className="card">
        <form onSubmit={onCreate} className="grid grid-2">
          <label>
            Alias
            <input value={alias} onChange={(e) => setAlias(e.target.value)} required />
          </label>
          <label>
            Item
            <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </label>
          <button type="submit">Salvar alias</button>
        </form>
        {error && <p style={{ color: "#b00020" }}>{error}</p>}
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Alias</th>
              <th>Item</th>
              <th>Criado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.alias}</td>
                <td>{row.item?.name || "-"}</td>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td>
                  <button className="danger" onClick={() => remove(row.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}




