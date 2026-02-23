"use client";

import { STORAGE_METHODS } from "@/lib/constants";
import { useEffect, useState } from "react";

type Group = { id: string; name: string };
type Item = {
  id: string;
  name: string;
  groupId?: string | null;
  group?: Group | null;
  sif?: string | null;
  notes?: string | null;
  methodQuente?: boolean;
  methodPistaFria?: boolean;
  methodDescongelando?: boolean;
  methodResfriado?: boolean;
  methodCongelado?: boolean;
  methodAmbienteSecos?: boolean;
};

const empty = {
  name: "",
  groupId: "",
  sif: "",
  notes: "",
  methodQuente: false,
  methodPistaFria: false,
  methodDescongelando: false,
  methodResfriado: false,
  methodCongelado: false,
  methodAmbienteSecos: false,
};

const methodFieldByLabel: Record<string, keyof typeof empty> = {
  QUENTE: "methodQuente",
  "PISTA FRIA": "methodPistaFria",
  DESCONGELANDO: "methodDescongelando",
  RESFRIADO: "methodResfriado",
  CONGELADO: "methodCongelado",
  "AMBIENTE SECOS": "methodAmbienteSecos",
};

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupFilter, setGroupFilter] = useState("");
  const [form, setForm] = useState<any>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

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
    setError("");
    const payload = {
      ...form,
      groupId: form.groupId || null,
    };

    const res = await fetch(`/api/items${editingId ? `/${editingId}` : ""}`, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erro ao salvar item");
      return;
    }

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
      ...empty,
      ...item,
      groupId: item.groupId ?? "",
    });
  }

  function enabledMethods(item: Item) {
    const active = STORAGE_METHODS.filter((label) => item[methodFieldByLabel[label]]);
    return active.length ? active.join(", ") : "-";
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

          <label style={{ gridColumn: "1 / -1" }}>Métodos aplicáveis</label>
          <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {STORAGE_METHODS.map((method) => {
              const field = methodFieldByLabel[method];
              return (
                <label key={method} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(form[field])}
                    onChange={(e) => setForm({ ...form, [field]: e.target.checked })}
                  />
                  {method}
                </label>
              );
            })}
          </div>

          <label style={{ gridColumn: "1 / -1" }}>Observações<textarea placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>

          <button type="submit">{editingId ? "Salvar" : "Criar"}</button>
        </form>
        {error && <p style={{ color: "#b00020" }}>{error}</p>}
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Nome</th><th>Grupo</th><th>Métodos</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.group?.name || "-"}</td>
                <td>{enabledMethods(item)}</td>
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
