"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [form, setForm] = useState<any>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((r) => r.json())
      .then((data) => setForm(data));
  }, []);

  async function onSave() {
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || "Falha ao salvar");
    setForm(data);
    setMessage("Dados atualizados com sucesso");
  }

  async function contratarMaisImpressoras() {
    const qty = Number(prompt("Quantas impressoras deseja contratar no total?", String(form?.printerLimit || 1)) || 0);
    if (!qty || qty < 1) return;

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || "Falha ao abrir checkout");
    if (data.url) window.location.href = data.url;
  }

  if (!form) return <div className="card">Carregando...</div>;

  return (
    <>
      <h1>Admin da Conta</h1>
      <div className="card grid">
        <label>Razão Social<input value={form.legalName || ""} onChange={(e) => setForm({ ...form, legalName: e.target.value })} /></label>
        <label>Nome Fantasia<input value={form.tradeName || ""} onChange={(e) => setForm({ ...form, tradeName: e.target.value })} /></label>
        <label>CNPJ<input value={form.cnpj || ""} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></label>
        <label>Endereço Comercial<input value={form.businessAddress || ""} onChange={(e) => setForm({ ...form, businessAddress: e.target.value })} /></label>
        <div className="grid grid-3">
          <label>Bairro<input value={form.neighborhood || ""} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} /></label>
          <label>Cidade<input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
          <label>Estado<input value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} /></label>
        </div>
        <label>CEP<input value={form.zipCode || ""} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} /></label>
        <label>Inscrição Estadual<input value={form.stateRegistration || ""} onChange={(e) => setForm({ ...form, stateRegistration: e.target.value })} /></label>

        <div className="card" style={{ margin: 0 }}>
          <strong>Plano atual:</strong> {form.printerLimit || 1} impressora(s)
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={contratarMaisImpressoras}>Contratar mais impressoras</button>
            <button type="button" className="danger">Cancelar plano (em breve)</button>
          </div>
        </div>

        <button type="button" onClick={onSave}>Salvar alterações</button>
      </div>
      {error && <div className="card" style={{ color: "#b00020" }}>{error}</div>}
      {message && <div className="card" style={{ color: "#0a7a00" }}>{message}</div>}
    </>
  );
}
