"use client";

import { useEffect, useState } from "react";

type Group = { id: string; name: string };

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");

  async function load() {
    const res = await fetch("/api/groups");
    setGroups(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    setName("");
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <h1>Grupos</h1>
      <div className="card">
        <form onSubmit={create} className="grid grid-2">
          <label>Nome do grupo<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <button type="submit">Criar grupo</button>
        </form>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>Nome</th><th>Ações</th></tr></thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id}><td>{g.name}</td><td><button className="danger" onClick={() => remove(g.id)}>Excluir</button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
