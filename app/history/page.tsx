"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "@/lib/date";
import { STORAGE_METHODS } from "@/lib/constants";

type Row = {
  id: string;
  storageMethod: string;
  producedAt: string;
  expiresAt: string;
  quantity: number;
  item: { id: string; name: string };
  user: { id: string; name: string; unit?: string };
};

export default function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState({ itemId: "", storageMethod: "", userId: "", unit: "TODAS", start: "", end: "" });

  async function loadFilters() {
    const [itemsRes, historyRes] = await Promise.all([fetch("/api/items"), fetch("/api/history")]);
    const itemList = await itemsRes.json();
    const history = await historyRes.json();
    setItems(itemList.map((i: any) => ({ id: i.id, name: i.name })));
    setRows(history);
    const uniqueUsers = Array.from(new Map(history.map((r: any) => [r.user.id, r.user])).values()) as any;
    setUsers(uniqueUsers);
  }

  useEffect(() => {
    loadFilters();
  }, []);

  async function apply() {
    const qs = new URLSearchParams(filters as any).toString();
    const res = await fetch(`/api/history?${qs}`);
    const data = await res.json();
    setRows(data);
  }

  const now = useMemo(() => new Date(), [rows]);

  return (
    <>
      <h1>Histórico de Emissões</h1>
      <div className="card grid grid-3">
        <select value={filters.itemId} onChange={(e) => setFilters({ ...filters, itemId: e.target.value })}>
          <option value="">Todos itens</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select value={filters.storageMethod} onChange={(e) => setFilters({ ...filters, storageMethod: e.target.value })}>
          <option value="">Todos métodos</option>
          {STORAGE_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })}>
          <option value="">Todos usuários</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={filters.unit} onChange={(e) => setFilters({ ...filters, unit: e.target.value })}>
          <option value="TODAS">Todas filiais</option>
          <option value="BROOKLIN">BROOKLIN</option>
          <option value="PINHEIROS">PINHEIROS</option>
        </select>
        <input type="date" value={filters.start} onChange={(e) => setFilters({ ...filters, start: e.target.value })} />
        <input type="date" value={filters.end} onChange={(e) => setFilters({ ...filters, end: e.target.value })} />
        <button onClick={apply}>Filtrar</button>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Item</th><th>Método</th><th>Produção</th><th>Validade</th><th>Qtd</th><th>Usuário</th><th>Filial</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const expired = new Date(r.expiresAt) < now;
              return (
                <tr key={r.id}>
                  <td>{r.item.name}</td>
                  <td>{r.storageMethod}</td>
                  <td>{formatDateTime(r.producedAt)}</td>
                  <td>{formatDateTime(r.expiresAt)}</td>
                  <td>{r.quantity}</td>
                  <td>{r.user.name}</td>
                  <td>{r.user.unit || "-"}</td>
                  <td className={expired ? "badge-expired" : "badge-ok"}>{expired ? "VENCIDO" : "OK"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
