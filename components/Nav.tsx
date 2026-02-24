"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { LowLogo } from "@/components/LowLogo";

export function Nav() {
  const { data } = useSession();
  const [openCadastro, setOpenCadastro] = useState(false);

  if (!data?.user) return null;

  const isAdmin = data.user.role === "ADMIN";

  return (
    <div className="nav card">
      <Link href="/" style={{ marginRight: 8 }} aria-label="Ir para home">
        <LowLogo width={112} compact />
      </Link>

      {isAdmin && (
        <div
          className="nav-dropdown"
          onMouseEnter={() => setOpenCadastro(true)}
          onMouseLeave={() => setOpenCadastro(false)}
        >
          <span className="nav-dropdown-trigger">Cadastrar</span>
          {openCadastro && (
            <div className="nav-dropdown-menu">
              <Link href="/items">Itens</Link>
              <Link href="/groups">Grupos</Link>
              <Link href="/users">Usuários</Link>
              <Link href="/printers">Impressoras</Link>
              <Link href="/history">Histórico</Link>
            </div>
          )}
        </div>
      )}

      <Link href="/print" className="nav-btn nav-emit">Emitir</Link>
      <Link href="/print-easy" className="nav-btn nav-digitar">DIGITAR</Link>
      <Link href="/print-voice" className="nav-btn nav-falar">FALAR</Link>

      <span style={{ marginLeft: "auto" }}>Olá, {data.user.name} ({data.user.unit})</span>
      <button className="secondary nav-btn" onClick={() => signOut({ callbackUrl: "/login" })}>Sair</button>
    </div>
  );
}
