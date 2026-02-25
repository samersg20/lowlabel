import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const username = String(body.username || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const unit = String(body.unit || "BROOKLIN").trim().toUpperCase();

    if (!name || !username || !email || !password) {
      return NextResponse.json({ error: "Nome, usuário, e-mail e senha são obrigatórios" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Senha deve ter no mínimo 6 caracteres" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await prisma.user.create({
      data: {
        name,
        username,
        email,
        passwordHash,
        role: "OPERATOR",
        unit,
      },
      select: { id: true, name: true, username: true, email: true, role: true, unit: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    const isUnique = error?.code === "P2002";
    if (isUnique) {
      return NextResponse.json({ error: "Usuário ou e-mail já cadastrado" }, { status: 409 });
    }
    return NextResponse.json({ error: "Não foi possível realizar o cadastro" }, { status: 500 });
  }
}
