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
      <div style={{ marginRight: 8 }}><LowLogo width={92} compact /></div>

      {isAdmin && (
        <div
          className="nav-dropdown"
          onMouseEnter={() => setOpenCadastro(true)}
          onMouseLeave={() => setOpenCadastro(false)}
        >
          <span className="nav-dropdown-trigger">Cadastro</span>
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

      <Link href="/print" className="nav-emit">Emitir</Link>

      <span style={{ marginLeft: "auto" }}>Olá, {data.user.name} ({data.user.unit})</span>
      <button className="secondary" onClick={() => signOut({ callbackUrl: "/login" })}>Sair</button>
    </div>
  );
}
