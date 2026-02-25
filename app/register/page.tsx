"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { LowLogo } from "@/components/LowLogo";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    legalName: "",
    tradeName: "",
    cnpj: "",
    businessAddress: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    stateRegistration: "",
    printerCount: 1,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordHint = useMemo(() => "Mínimo 8 caracteres com letra, número e símbolo.", []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Falha ao cadastrar");

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      throw new Error("Checkout indisponível no momento");
    } catch (e: any) {
      setError(e.message || "Erro ao cadastrar");
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 720, margin: "40px auto", textAlign: "center" }}>
      <LowLogo width={220} />
      <h1>Criar conta</h1>
      <form className="grid" onSubmit={onSubmit} style={{ textAlign: "left" }}>
        <label>Nome Completo<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label>E-mail<input type="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Senha<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        <p style={{ margin: 0, color: "#5b6774", fontSize: 13 }}>{passwordHint}</p>

        <label>Razão Social<input value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} required /></label>
        <label>Nome Fantasia<input value={form.tradeName} onChange={(e) => setForm({ ...form, tradeName: e.target.value })} required /></label>
        <label>CNPJ<input inputMode="numeric" pattern="[0-9\.\/\-]{14,18}" title="Digite um CNPJ válido" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} required /></label>
        <label>Endereço Comercial Completo<input value={form.businessAddress} onChange={(e) => setForm({ ...form, businessAddress: e.target.value })} required /></label>

        <div className="grid grid-3">
          <label>Bairro<input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} required /></label>
          <label>Cidade<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></label>
          <label>Estado<input maxLength={2} pattern="[A-Za-z]{2}" title="Use a sigla do estado, ex: SP" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} required /></label>
        </div>
        <div className="grid grid-2">
          <label>CEP<input inputMode="numeric" pattern="\d{5}-?\d{3}" title="Use o formato 00000-000" value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} required /></label>
          <label>Inscrição Estadual (ou isento)<input value={form.stateRegistration} onChange={(e) => setForm({ ...form, stateRegistration: e.target.value })} /></label>
        </div>

        <label>Quantidade de impressoras no plano (R$100/mês cada)
          <input
            type="number"
            min={1}
            value={form.printerCount}
            onChange={(e) => setForm({ ...form, printerCount: Math.max(1, Number(e.target.value || 1)) })}
            required
          />
        </label>

        <button type="submit" disabled={loading}>{loading ? "Abrindo checkout..." : "Continuar para pagamento"}</button>
      </form>
      <p style={{ marginTop: 10 }}><Link href="/login">Voltar para login</Link></p>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
    </div>
  );
}
