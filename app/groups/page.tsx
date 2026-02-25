"use client";

import { useEffect, useState } from "react";

type Group = { id: string; name: string };

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/groups");
    setGroups(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch(editingId ? `/api/groups/${editingId}` : "/api/groups", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    setEditingId(null);
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(g: Group) {
    setEditingId(g.id);
    setName(g.name);
  }

  return (
    <>
      <h1>Grupos</h1>
      <div className="card">
        <form onSubmit={submit} className="grid grid-2">
          <label>Nome do grupo<input value={name} onChange={(e) => setName(e.target.value.toUpperCase())} required /></label>
          <button type="submit">{editingId ? "Salvar grupo" : "Criar grupo"}</button>
        </form>
      </div>
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Nome</th><th>Ações</th></tr></thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>
                  <button className="secondary" onClick={() => startEdit(g)}>Editar</button>{" "}
                  <button className="danger" onClick={() => remove(g.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
