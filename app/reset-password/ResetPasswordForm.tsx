"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("As senhas não coincidem.");
      return;
    }

    const res = await fetch("/api/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data.error || "Não foi possível redefinir a senha.");
      return;
    }

    setMessage("Senha redefinida com sucesso. Redirecionando para o login...");
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <>
      <form className="grid" onSubmit={onSubmit}>
        <label>Nova senha<input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <label>Confirmar senha<input type="password" minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></label>
        <button type="submit" disabled={!token}>Salvar nova senha</button>
      </form>
      {!token && <p style={{ color: "#b00020" }}>Token ausente ou inválido.</p>}
      {message && <p>{message}</p>}
    </>
  );
}
