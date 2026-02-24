"use client";

import { useEffect, useState } from "react";

type Printer = {
  id: string;
  name: string;
  unit: string;
  printerId: number;
  isActive: boolean;
  apiKeyMasked: string;
};

const emptyForm = {
  name: "",
  unit: "BROOKLIN",
  printerId: "",
  apiKey: "",
  isActive: true,
};

export default function PrintersPage() {
  const [rows, setRows] = useState<Printer[]>([]);
  const [units, setUnits] = useState<string[]>(["BROOKLIN", "PINHEIROS"]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/printers");
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    const unitsRes = await fetch("/api/units");
    const unitsData = await unitsRes.json().catch(() => []);
    if (Array.isArray(unitsData) && unitsData.length) {
      setUnits(unitsData.map((u: any) => u.name));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload = {
      name: form.name,
      unit: form.unit,
      printerId: Number(form.printerId),
      apiKey: form.apiKey,
      isActive: form.isActive,
    };

    const res = await fetch(editingId ? `/api/printers/${editingId}` : "/api/printers", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erro ao salvar impressora");
      return;
    }

    setEditingId(null);
    setForm(emptyForm);
    await load();
  }

  function startEdit(row: Printer) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      unit: row.unit,
      printerId: String(row.printerId),
      apiKey: "",
      isActive: row.isActive,
    });
  }

  async function remove(id: string) {
    await fetch(`/api/printers/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <>
      <h1>Impressoras</h1>
      <div className="card">
        <form className="grid grid-3" onSubmit={submit}>
          <label>
            Nome
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Unidade
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {units.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
          <label>
            PrintNode Printer ID
            <input
              type="number"
              min={1}
              value={form.printerId}
              onChange={(e) => setForm({ ...form, printerId: e.target.value })}
              required
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            API Key PrintNode
            <input
              type="password"
              placeholder={editingId ? "Preencha só se quiser alterar a API key" : "Ex: xxxxxxxxx"}
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              required={!editingId}
            />
          </label>
          <label style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "row", alignItems: "center", gap: 8, fontWeight: 600 }}>
            <input
              style={{ width: 20, height: 20 }}
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Ativa para emissão
          </label>
          <button type="submit">{editingId ? "Salvar impressora" : "Criar impressora"}</button>
        </form>
        {error && <p style={{ color: "#b00020" }}>{error}</p>}
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Unidade</th>
              <th>Printer ID</th>
              <th>API Key</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.unit}</td>
                <td>{row.printerId}</td>
                <td>{row.apiKeyMasked}</td>
                <td>{row.isActive ? "ATIVA" : "INATIVA"}</td>
                <td>
                  <button className="secondary" onClick={() => startEdit(row)}>Editar</button>{" "}
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
