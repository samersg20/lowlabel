"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function Nav() {
  const { data } = useSession();
  if (!data?.user) return null;

  return (
    <div className="nav card">
      <Link href="/items">Itens</Link>
      <Link href="/print">Emitir</Link>
      <Link href="/history">Histórico</Link>
      <span style={{ marginLeft: "auto" }}>Olá, {data.user.name}</span>
      <button className="secondary" onClick={() => signOut({ callbackUrl: "/login" })}>Sair</button>
    </div>
  );
}
