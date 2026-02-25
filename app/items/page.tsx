"use client";

import { STORAGE_METHODS } from "@/lib/constants";
import { useEffect, useRef, useState } from "react";

type Group = { id: string; name: string };
type Item = {
  id: string;
  name: string;
  groupId?: string | null;
  group?: Group | null;
  sif?: string | null;
  preferredStorageMethod?: string | null;
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
  preferredStorageMethod: "",
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
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      notes: null,
      preferredStorageMethod: form.preferredStorageMethod || null,
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
      preferredStorageMethod: item.preferredStorageMethod ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function enabledMethods(item: Item) {
    const active = STORAGE_METHODS.filter((label) => item[methodFieldByLabel[label]]);
    return active.length ? active.join(", ") : "-";
  }

  function toggleMethod(method: string) {
    const field = methodFieldByLabel[method];
    const next = { ...form, [field]: !form[field] };

    if (next.preferredStorageMethod && !next[methodFieldByLabel[next.preferredStorageMethod]]) {
      next.preferredStorageMethod = "";
    }

    setForm(next);
  }

  async function exportItems() {
    const res = await fetch("/api/items/export");
    if (!res.ok) {
      setImportError("Erro ao exportar itens");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `itens-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function importItems(file: File) {
    setImportMessage("");
    setImportError("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/items/import", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setImportError(data.error || "Erro de importação, verifique o arquivo");
      return;
    }
    setImportMessage(data.message || "OK, importado");
    load();
  }

  const enabledOptions = STORAGE_METHODS.filter((method) => Boolean(form[methodFieldByLabel[method]]));

  return (
    <>
      <h1>Itens</h1>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Importar / Exportar Itens</h2>
        <p style={{ marginTop: 0 }}>A importação adiciona novos itens e atualiza existentes, sem apagar itens antigos. Use S/N nos métodos e o número do Método Principal conforme o módulo Métodos.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="secondary" onClick={exportItems}>Exportar XLSX</button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>Importar XLSX</button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importItems(file);
              e.currentTarget.value = "";
            }}
          />
        </div>
        {importMessage && <p style={{ color: "#0b7a2a", fontWeight: 600 }}>{importMessage}</p>}
        {importError && <p style={{ color: "#b00020", fontWeight: 600 }}>{importError}</p>}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Cadastrar</h2>
        <form className="grid grid-3" onSubmit={submit}>
          <label>Item<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })} required /></label>
          <label>Grupo
            <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })} required>
              <option value="">Selecione...</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </label>
          <label>SIF<input placeholder="SIF (opcional)" value={form.sif} onChange={(e) => setForm({ ...form, sif: e.target.value })} /></label>

          <div style={{ gridColumn: "1 / -1" }}>
            <p className="section-label">Métodos aplicáveis</p>
            <div className="method-grid">
              {STORAGE_METHODS.map((method) => {
                const field = methodFieldByLabel[method];
                const selected = Boolean(form[field]);
                return (
                  <button
                    key={method}
                    type="button"
                    className={`method-pill ${selected ? "selected" : ""}`}
                    onClick={() => toggleMethod(method)}
                  >
                    {method}
                  </button>
                );
              })}
            </div>
          </div>

          <label>
            Método principal
            <select
              value={form.preferredStorageMethod}
              onChange={(e) => setForm({ ...form, preferredStorageMethod: e.target.value })}
            >
              <option value="">Selecione (opcional)</option>
              {enabledOptions.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </label>

          <button type="submit">{editingId ? "Salvar" : "Criar"}</button>
        </form>
        {error && <p style={{ color: "#b00020" }}>{error}</p>}
      </div>

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

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Nome</th><th>Grupo</th><th>Métodos</th><th>Método principal</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.group?.name || "-"}</td>
                  <td>{enabledMethods(item)}</td>
                  <td>{item.preferredStorageMethod || "-"}</td>
                  <td>
                    <button className="secondary" onClick={() => startEdit(item)}>Editar</button>{" "}
                    <button className="danger" onClick={() => remove(item.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
