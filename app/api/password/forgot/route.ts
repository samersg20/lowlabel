import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createResetToken } from "@/lib/password-reset";
import { sendResetPasswordEmail } from "@/lib/email";

const EXPIRES_IN_MINUTES = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const { rawToken, tokenHash } = createResetToken();
    const expiresAt = new Date(Date.now() + EXPIRES_IN_MINUTES * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    await sendResetPasswordEmail(user.email, resetUrl);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao processar recuperação de senha", error);
    return NextResponse.json({ error: "Não foi possível enviar o e-mail de recuperação" }, { status: 500 });
  }
}
