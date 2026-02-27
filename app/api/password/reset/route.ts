import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { hashResetToken } from "@/lib/password-reset";
import { withRlsBypassTx } from "@/lib/tenant-tx";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token || !password || password.length < 6) {
    return NextResponse.json({ error: "Token inválido ou senha muito curta" }, { status: 400 });
  }

  const tokenHash = hashResetToken(token);
  const result = await withRlsBypassTx(async ({ tx }) => {
    const resetToken = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!resetToken || resetToken.expiresAt < new Date()) {
      return { ok: false as const };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await tx.$transaction([
      tx.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      tx.passwordResetToken.delete({ where: { id: resetToken.id } }),
    ]);

    return { ok: true as const };
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}



