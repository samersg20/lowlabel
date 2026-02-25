"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { LowLogo } from "@/components/LowLogo";

export default function LoginPage() {
  const router = useRouter();
  const { data } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (data?.user) router.push("/");
  }, [data, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await signIn("credentials", { identifier, password, redirect: false });
    if (res?.error) return setError("Credenciais inválidas");
    router.push("/");
  }

  return (
    <div className="card" style={{ maxWidth: 460, margin: "40px auto", textAlign: "center" }}>
      <LowLogo width={220} />
      <form className="grid" onSubmit={onSubmit} style={{ textAlign: "left" }}>
        <label>E-mail<input name="identifier" type="email" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} /></label>
        <label>Senha<input name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button type="submit">Entrar</button>
      </form>
      <p style={{ marginTop: 10 }}><Link href="/forgot-password">Esqueci minha senha</Link></p>
      <p style={{ marginTop: 6 }}><Link href="/register">Criar conta</Link></p>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
    </div>
  );
}
