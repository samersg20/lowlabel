"use client";

import { useEffect, useState } from "react";

type User = { id: string; name: string; email: string; role: string; unit: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "OPERATOR", unit: "BROOKLIN" });

  async function load() {
    const res = await fetch("/api/users");
    setUsers(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", email: "", password: "", role: "OPERATOR", unit: "BROOKLIN" });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <h1>Usuários</h1>
      <div className="card">
        <form onSubmit={create} className="grid grid-3">
          <label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Senha<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
          <label>Perfil<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="OPERATOR">OPERADOR</option><option value="ADMIN">ADMIN</option></select></label>
          <label>Unidade<select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}><option value="BROOKLIN">BROOKLIN</option><option value="PINHEIROS">PINHEIROS</option></select></label>
          <button type="submit">Criar usuário</button>
        </form>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Unidade</th><th>Ações</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.unit}</td><td><button className="danger" onClick={() => remove(u.id)}>Excluir</button></td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
