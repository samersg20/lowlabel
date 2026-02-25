"use client";

import { useEffect, useRef, useState } from "react";

type Group = { id: string; name: string };
type Method = { id: number; name: string };
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

type ItemForm = {
  name: string;
  groupId: string;
  sif: string;
  preferredStorageMethod: string;
  methodQuente: boolean;
  methodPistaFria: boolean;
  methodDescongelando: boolean;
  methodResfriado: boolean;
  methodCongelado: boolean;
  methodAmbienteSecos: boolean;
};

const empty: ItemForm = {
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

const methodFieldByLabel: Record<string, keyof ItemForm> = {
  QUENTE: "methodQuente",
  "PISTA FRIA": "methodPistaFria",
  DESCONGELANDO: "methodDescongelando",
  RESFRIADO: "methodResfriado",
  CONGELADO: "methodCongelado",
  AMBIENTE: "methodAmbienteSecos",
};

function toMethodLabel(name: string) {
  const normalized = String(name || "").trim().toUpperCase();
  if (normalized === "AMBIENTE SECOS") return "AMBIENTE";
  return normalized;
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [groupFilter, setGroupFilter] = useState("");
  const [form, setForm] = useState<ItemForm>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [methodsOpen, setMethodsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const availableMethods = methods.map((m) => toMethodLabel(m.name)).filter((name, idx, arr) => arr.indexOf(name) === idx);

  async function loadGroups() {
    const res = await fetch("/api/groups");
    setGroups(await res.json());
  }

  async function loadMethods() {
    const res = await fetch("/api/methods");
    setMethods(await res.json());
  }

  async function load() {
    const qs = groupFilter ? `?groupId=${groupFilter}` : "";
    const res = await fetch(`/api/items${qs}`);
    setItems(await res.json());
  }

  useEffect(() => {
    loadGroups();
    loadMethods();
  }, []);

  useEffect(() => {
    load();
  }, [groupFilter]);

  function checkedMethodsCount(currentForm: ItemForm) {
    return Object.values(methodFieldByLabel).reduce((sum, field) => sum + (currentForm[field] ? 1 : 0), 0);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (checkedMethodsCount(form) < 1) {
      setError("Selecione pelo menos um método aplicável.");
      return;
    }

    if (!form.preferredStorageMethod) {
      setError("Método principal é obrigatório.");
      return;
    }

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
      name: item.name || "",
      groupId: item.groupId ?? "",
      sif: item.sif ?? "",
      preferredStorageMethod: toMethodLabel(item.preferredStorageMethod ?? ""),
      methodQuente: Boolean(item.methodQuente),
      methodPistaFria: Boolean(item.methodPistaFria),
      methodDescongelando: Boolean(item.methodDescongelando),
      methodResfriado: Boolean(item.methodResfriado),
      methodCongelado: Boolean(item.methodCongelado),
      methodAmbienteSecos: Boolean(item.methodAmbienteSecos),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function enabledMethods(item: Item) {
    const active = availableMethods.filter((label) => item[methodFieldByLabel[label]]);
    return active.length ? active.join(", ") : "-";
  }

  function toggleMethod(method: string) {
    const field = methodFieldByLabel[method];
    if (!field) return;

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

  const enabledOptions = availableMethods.filter((method) => Boolean(form[methodFieldByLabel[method]]));

  return (
    <>
      <h1>Itens</h1>

      <div className="card">
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
            <p className="section-label">Métodos aplicáveis *</p>
            <div className="method-multiselect" onMouseLeave={() => setMethodsOpen(false)}>
              <button
                type="button"
                className="method-multiselect-trigger"
                onClick={() => setMethodsOpen((prev) => !prev)}
                aria-expanded={methodsOpen}
              >
                {enabledOptions.length ? `${enabledOptions.length} selecionado(s)` : "Selecionar métodos"}
                <span>{methodsOpen ? "▲" : "▼"}</span>
              </button>

              {methodsOpen && (
                <div className="method-multiselect-panel">
                  {availableMethods.map((method) => {
                    const field = methodFieldByLabel[method];
                    const selected = Boolean(form[field]);
                    return (
                      <label key={method} className="method-multiselect-option">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleMethod(method)}
                        />
                        {method}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <label>
            Método principal *
            <select
              value={form.preferredStorageMethod}
              onChange={(e) => setForm({ ...form, preferredStorageMethod: e.target.value })}
              required
            >
              <option value="">Selecione...</option>
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
                  <td>{toMethodLabel(item.preferredStorageMethod || "-")}</td>
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
