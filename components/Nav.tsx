"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function Nav() {
  const { data } = useSession();
  if (!data?.user) return null;

  return (
    <div className="nav card">
      <Image src="/lowbbq-logo.svg" alt="Low BBQ" width={86} height={38} style={{ marginRight: 8 }} />
      <Link href="/items">Itens</Link>
      <Link href="/print">Emitir</Link>
      <Link href="/history">Histórico</Link>
      <Link href="/groups">Grupos</Link>
      <Link href="/users">Usuários</Link>
      <span style={{ marginLeft: "auto" }}>Olá, {data.user.name} ({data.user.unit})</span>
      <button className="secondary" onClick={() => signOut({ callbackUrl: "/login" })}>Sair</button>
    </div>
  );
}
