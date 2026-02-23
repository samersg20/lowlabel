"use client";

import { useEffect, useState } from "react";

type Group = { id: string; name: string };
type Item = {
  id: string;
  name: string;
  groupId?: string | null;
  group?: Group | null;
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
  groupId: "",
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupFilter, setGroupFilter] = useState("");
  const [form, setForm] = useState<any>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadGroups() {
    const res = await fetch("/api/groups");
    setGroups(await res.json());
  }

  async function load() {
    const qs = groupFilter ? `?groupId=${groupFilter}` : "";
    const res = await fetch(`/api/items${qs}`);
    setItems(await res.json());
  }

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    load();
  }, [groupFilter]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      groupId: form.groupId || null,
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
      groupId: item.groupId ?? "",
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
        <div style={{ marginBottom: 12 }}>
          <label>
            Filtrar por grupo
            <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
              <option value="">Todos</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </label>
        </div>

        <form className="grid grid-3" onSubmit={submit}>
          <label>Item<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>Grupo
            <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })} required>
              <option value="">Selecione...</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </label>
          <label>SIF<input placeholder="SIF (opcional)" value={form.sif} onChange={(e) => setForm({ ...form, sif: e.target.value })} /></label>

          <label>Resfriado<input placeholder="Resfriado (dias)" type="number" value={form.chilledHours} onChange={(e) => setForm({ ...form, chilledHours: e.target.value })} /></label>
          <label>Congelado<input placeholder="Congelado (dias)" type="number" value={form.frozenHours} onChange={(e) => setForm({ ...form, frozenHours: e.target.value })} /></label>
          <label>Ambiente<input placeholder="Ambiente (dias)" type="number" value={form.ambientHours} onChange={(e) => setForm({ ...form, ambientHours: e.target.value })} /></label>

          <label>Quente<input placeholder="Quente (dias)" type="number" value={form.hotHours} onChange={(e) => setForm({ ...form, hotHours: e.target.value })} /></label>
          <label>Descongelando<input placeholder="Descongelando (dias)" type="number" value={form.thawingHours} onChange={(e) => setForm({ ...form, thawingHours: e.target.value })} /></label>
          <label>Observações<textarea placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>

          <button type="submit">{editingId ? "Salvar" : "Criar"}</button>
        </form>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Nome</th><th>Grupo</th><th>Shelf life (dias)</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.group?.name || "-"}</td>
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
