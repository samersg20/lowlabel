"use client";

import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const res = await fetch("/api/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setMessage("Se o e-mail existir, enviaremos um link para redefinição de senha.");
      return;
    }

    setMessage("Não foi possível processar a solicitação.");
  }

  return (
    <div className="card" style={{ maxWidth: 460, margin: "40px auto" }}>
      <h1>Esqueci minha senha</h1>
      <p>Informe seu e-mail para receber o link de redefinição.</p>
      <form className="grid" onSubmit={onSubmit}>
        <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <button type="submit">Enviar link</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}
