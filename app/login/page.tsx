"use client";

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
    if (res?.error) {
      setError("Credenciais inválidas");
      return;
    }
    router.push("/print");
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>SafeLabel - Login</h1>
      <form className="grid" onSubmit={onSubmit}>
        <label>E-mail<input name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Senha<input name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button type="submit">Entrar</button>
      </form>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      <p style={{ fontSize: 12 }}>Admin: admin@safelabel.local / admin123</p>
    </div>
  );
}
