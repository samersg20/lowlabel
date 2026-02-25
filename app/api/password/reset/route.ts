import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashResetToken } from "@/lib/password-reset";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token || !password || password.length < 6) {
    return NextResponse.json({ error: "Token inválido ou senha muito curta" }, { status: 400 });
  }

  const tokenHash = hashResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.delete({ where: { id: resetToken.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
