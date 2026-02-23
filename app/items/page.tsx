"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  name: string;
  type: "INGREDIENTE" | "PREPARACAO";
  sif?: string | null;
  notes?: string | null;
  chilledHours?: number | null;
  frozenHours?: number | null;
  ambientHours?: number | null;
  hotHours?: number | null;
  thawingHours?: number | null;
};

const empty = {
  name: "",
  type: "INGREDIENTE",
  sif: "",
  notes: "",
  chilledHours: "",
  frozenHours: "",
  ambientHours: "",
  hotHours: "",
  thawingHours: "",
};

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/items");
    setItems(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      chilledHours: form.chilledHours ? Number(form.chilledHours) : null,
      frozenHours: form.frozenHours ? Number(form.frozenHours) : null,
      ambientHours: form.ambientHours ? Number(form.ambientHours) : null,
      hotHours: form.hotHours ? Number(form.hotHours) : null,
      thawingHours: form.thawingHours ? Number(form.thawingHours) : null,
    };

    await fetch(`/api/items${editingId ? `/${editingId}` : ""}`, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setForm(empty);
    setEditingId(null);
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setForm({
      ...item,
      chilledHours: item.chilledHours ?? "",
      frozenHours: item.frozenHours ?? "",
      ambientHours: item.ambientHours ?? "",
      hotHours: item.hotHours ?? "",
      thawingHours: item.thawingHours ?? "",
    });
  }

  return (
    <>
      <h1>Itens</h1>
      <div className="card">
        <form className="grid grid-3" onSubmit={submit}>
          <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="INGREDIENTE">INGREDIENTE</option>
            <option value="PREPARACAO">PREPARACAO</option>
          </select>
          <input placeholder="SIF (opcional)" value={form.sif} onChange={(e) => setForm({ ...form, sif: e.target.value })} />
          <input placeholder="Resfriado (dias)" type="number" value={form.chilledHours} onChange={(e) => setForm({ ...form, chilledHours: e.target.value })} />
          <input placeholder="Congelado (dias)" type="number" value={form.frozenHours} onChange={(e) => setForm({ ...form, frozenHours: e.target.value })} />
          <input placeholder="Ambiente (dias)" type="number" value={form.ambientHours} onChange={(e) => setForm({ ...form, ambientHours: e.target.value })} />
          <input placeholder="Quente (dias)" type="number" value={form.hotHours} onChange={(e) => setForm({ ...form, hotHours: e.target.value })} />
          <input placeholder="Descongelando (dias)" type="number" value={form.thawingHours} onChange={(e) => setForm({ ...form, thawingHours: e.target.value })} />
          <textarea placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button type="submit">{editingId ? "Salvar" : "Criar"}</button>
        </form>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Nome</th><th>Tipo</th><th>Shelf life (dias)</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.type}</td>
                <td>R:{item.chilledHours ?? "-"} C:{item.frozenHours ?? "-"} A:{item.ambientHours ?? "-"} Q:{item.hotHours ?? "-"} D:{item.thawingHours ?? "-"}</td>
                <td>
                  <button className="secondary" onClick={() => startEdit(item)}>Editar</button>{" "}
                  <button className="danger" onClick={() => remove(item.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
