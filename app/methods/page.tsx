"use client";

import { useEffect, useState } from "react";

type Method = { id: number; name: string; durationValue: number; durationUnit: "hours" | "days" };

export default function MethodsPage() {
  const [rows, setRows] = useState<Method[]>([]);
  const [form, setForm] = useState({ name: "", durationValue: 1, durationUnit: "days" as "hours" | "days" });
  const [editing, setEditing] = useState<number | null>(null);

  async function load() { setRows(await fetch("/api/methods").then((r) => r.json())); }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/methods/${editing}` : "/api/methods";
    const method = editing ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ name: "", durationValue: 1, durationUnit: "days" });
    setEditing(null);
    load();
  }

  return <>
    <h1>Métodos</h1>
    <div className="card"><form className="grid grid-3" onSubmit={submit}>
      <label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })} required /></label>
      <label>Tempo<input type="number" min={1} value={form.durationValue} onChange={(e) => setForm({ ...form, durationValue: Number(e.target.value) })} required /></label>
      <label>Unidade<select value={form.durationUnit} onChange={(e) => setForm({ ...form, durationUnit: e.target.value as any })}><option value="hours">Horas</option><option value="days">Dias</option></select></label>
      <button type="submit">{editing ? "Salvar" : "Criar"}</button>
    </form></div>
    <div className="card table-wrap"><table className="table"><thead><tr><th>#</th><th>Nome</th><th>Tempo</th><th>Ações</th></tr></thead><tbody>
      {rows.map((r) => <tr key={r.id}><td>{r.id}</td><td>{r.name}</td><td>{r.durationValue} {r.durationUnit === "hours" ? "horas" : "dias"}</td><td><button className="secondary" onClick={() => { setEditing(r.id); setForm({ name: r.name, durationValue: r.durationValue, durationUnit: r.durationUnit }); }}>Editar</button>{" "}<button className="danger" onClick={async () => { await fetch(`/api/methods/${r.id}`, { method: "DELETE" }); load(); }}>Excluir</button></td></tr>)}
    </tbody></table></div>
  </>;
}
