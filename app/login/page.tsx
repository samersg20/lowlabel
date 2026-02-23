"use client";

import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { data } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (data?.user) router.push("/print");
  }, [data, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) return setError("Credenciais inválidas");
    router.push("/print");
  }

  return (
    <div className="card" style={{ maxWidth: 460, margin: "40px auto", textAlign: "center" }}>
      <Image src="/lowbbq-logo.svg" alt="Low BBQ" width={220} height={96} />
      <h1>Emissor Etiquetas Low</h1>
      <form className="grid" onSubmit={onSubmit} style={{ textAlign: "left" }}>
        <label>E-mail<input name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Senha<input name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button type="submit">Entrar</button>
      </form>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      <p style={{ fontSize: 12 }}>Admin: admin@safelabel.local / admin123</p>
    </div>
  );
}
