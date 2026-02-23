"use client";

import { useEffect, useState } from "react";

type User = { id: string; name: string; email: string; role: string; unit: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "OPERATOR", unit: "BROOKLIN" });

  async function load() {
    const res = await fetch("/api/users");
    setUsers(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch(editingId ? `/api/users/${editingId}` : "/api/users", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditingId(null);
    setForm({ name: "", email: "", password: "", role: "OPERATOR", unit: "BROOKLIN" });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(u: User) {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, unit: u.unit });
  }

  return (
    <>
      <h1>Usuários</h1>
      <div className="card">
        <form onSubmit={submit} className="grid grid-3">
          <label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Senha<input type="password" placeholder={editingId ? "Deixe vazio para manter" : "Senha"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingId} /></label>
          <label>Perfil<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="OPERATOR">OPERADOR</option><option value="ADMIN">ADMIN</option></select></label>
          <label>Unidade<select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}><option value="BROOKLIN">BROOKLIN</option><option value="PINHEIROS">PINHEIROS</option></select></label>
          <button type="submit">{editingId ? "Salvar usuário" : "Criar usuário"}</button>
        </form>
      </div>
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Unidade</th><th>Ações</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.unit}</td><td><button className="secondary" onClick={() => startEdit(u)}>Editar</button>{" "}<button className="danger" onClick={() => remove(u.id)}>Excluir</button></td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
