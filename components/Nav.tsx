"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { LowLogo } from "@/components/LowLogo";

export function Nav() {
  const { data } = useSession();
  const [openCadastro, setOpenCadastro] = useState(false);
  const [openEmitir, setOpenEmitir] = useState(false);

  if (!data?.user) return null;

  const isAdmin = data.user.role === "ADMIN";
  const unitShort = String(data.user.unit || "").slice(0, 3).toUpperCase();

  return (
    <div className="nav card">
      <div className="nav-row nav-row-logo">
        <Link href="/" aria-label="Ir para home" className="nav-logo">
          <LowLogo width={160} compact />
        </Link>
      </div>

      <div className="nav-row nav-row-actions">
        {isAdmin && (
          <div className="nav-dropdown" onMouseEnter={() => setOpenCadastro(true)} onMouseLeave={() => setOpenCadastro(false)}>
            <span className="nav-dropdown-trigger">Cadastrar</span>
            {openCadastro && (
              <div className="nav-dropdown-menu">
                <Link href="/items">Itens</Link>
                <Link href="/groups">Grupos</Link>
                <Link href="/methods">Métodos</Link>
                <Link href="/units">Unidades</Link>
                <Link href="/users">Usuários</Link>
                <Link href="/printers">Impressoras</Link>
                <Link href="/history">Histórico</Link>
              </div>
            )}
          </div>
        )}
        <div
          className="nav-dropdown nav-emit-dropdown"
          onMouseEnter={() => setOpenEmitir(true)}
          onMouseLeave={() => setOpenEmitir(false)}
        >
          <span className="nav-dropdown-trigger">Emitir</span>
          {openEmitir && (
            <div className="nav-dropdown-menu">
              <Link href="/print">Escolher</Link>
              <Link href="/print-easy">Digitar</Link>
              <Link href="/print-voice">Falar</Link>
            </div>
          )}
        </div>
      </div>

      <div className="nav-row nav-row-user">
        <span>Olá, {data.user.name} ({unitShort})</span>
        <button className="nav-signout" onClick={() => signOut({ callbackUrl: "/login" })}>Sair</button>
      </div>
    </div>
  );
}
