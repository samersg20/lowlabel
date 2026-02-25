"use client";

import { useEffect, useState } from "react";

type User = { id: string; name: string; username?: string | null; email: string; role: string; unit: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<string[]>(["BROOKLIN", "PINHEIROS"]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "", role: "OPERATOR", unit: "BROOKLIN" });

  async function load() {
    const res = await fetch("/api/users");
    setUsers(await res.json());
    const unitsRes = await fetch("/api/units");
    const unitsData = await unitsRes.json().catch(() => []);
    if (Array.isArray(unitsData) && unitsData.length) {
      setUnits(unitsData.map((u: any) => u.name));
    }
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch(editingId ? `/api/users/${editingId}` : "/api/users", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, username: form.username.trim() || null }),
    });
    setEditingId(null);
    setForm({ name: "", username: "", email: "", password: "", role: "OPERATOR", unit: "BROOKLIN" });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(u: User) {
    setEditingId(u.id);
    setForm({ name: u.name, username: u.username || "", email: u.email, password: "", role: u.role, unit: u.unit });
  }

  return (
    <>
      <h1>Usuários</h1>
      <div className="card">
        <form onSubmit={submit} className="grid grid-3">
          <label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>Usuário (login)<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Ex.: joao.silva" /></label>
          <label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Senha<input type="password" placeholder={editingId ? "Deixe vazio para manter" : "Senha"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingId} /></label>
          <label>Perfil<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="OPERATOR">OPERADOR</option><option value="ADMIN">ADMIN</option></select></label>
          <label>Unidade<select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>{units.map((u) => <option key={u} value={u}>{u}</option>)}</select></label>
          <button type="submit">{editingId ? "Salvar usuário" : "Criar usuário"}</button>
        </form>
      </div>
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Nome</th><th>Usuário</th><th>Email</th><th>Perfil</th><th>Unidade</th><th>Ações</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.id}><td>{u.name}</td><td>{u.username || "-"}</td><td>{u.email}</td><td>{u.role}</td><td>{u.unit}</td><td><button className="secondary" onClick={() => startEdit(u)}>Editar</button>{" "}<button className="danger" onClick={() => remove(u.id)}>Excluir</button></td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
