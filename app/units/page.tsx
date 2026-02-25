"use client";

import { useEffect, useState } from "react";

type Unit = { id: string; name: string; email: string; phone: string; managerName: string };

export default function UnitsPage() {
  const [rows, setRows] = useState<Unit[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", managerName: "" });
  const [editing, setEditing] = useState<string | null>(null);
  async function load() { setRows(await fetch("/api/units").then((r) => r.json())); }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/units/${editing}` : "/api/units";
    const method = editing ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ name: "", email: "", phone: "", managerName: "" });
    setEditing(null);
    load();
  }

  return <>
    <h1>Unidades</h1>
    <div className="card"><form className="grid grid-2" onSubmit={submit}>
      <label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
      <label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
      <label>Telefone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label>
      <label>Responsável<input value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} required /></label>
      <button type="submit">{editing ? "Salvar" : "Criar"}</button>
    </form></div>
    <div className="card table-wrap"><table className="table"><thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Responsável</th><th>Ações</th></tr></thead><tbody>
      {rows.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.email}</td><td>{r.phone}</td><td>{r.managerName}</td><td><button className="secondary" onClick={() => { setEditing(r.id); setForm({ name: r.name, email: r.email, phone: r.phone, managerName: r.managerName }); }}>Editar</button>{" "}<button className="danger" onClick={async () => { await fetch(`/api/units/${r.id}`, { method: "DELETE" }); load(); }}>Excluir</button></td></tr>)}
    </tbody></table></div>
  </>;
}
