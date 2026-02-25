"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LowLogo } from "@/components/LowLogo";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "", unit: "BROOKLIN" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Falha ao cadastrar");
      setSuccess("Cadastro realizado com sucesso! Faça login para continuar.");
      setTimeout(() => router.push("/login"), 800);
    } catch (e: any) {
      setError(e.message || "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "40px auto", textAlign: "center" }}>
      <LowLogo width={220} />
      <h1>Criar conta</h1>
      <form className="grid" onSubmit={onSubmit} style={{ textAlign: "left" }}>
        <label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label>Usuário<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label>
        <label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Senha<input type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        <label>Unidade
          <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            <option value="BROOKLIN">BROOKLIN</option>
            <option value="PINHEIROS">PINHEIROS</option>
          </select>
        </label>
        <button type="submit" disabled={loading}>{loading ? "Salvando..." : "Cadastrar"}</button>
      </form>
      <p style={{ marginTop: 10 }}><Link href="/login">Voltar para login</Link></p>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      {success && <p style={{ color: "#0a7a00" }}>{success}</p>}
    </div>
  );
}
