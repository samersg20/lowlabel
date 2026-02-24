export async function sendResetPasswordEmail(to: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "no-reply@lowlabel.local";

  if (!apiKey) {
    console.log(`[password-reset] RESEND_API_KEY não configurada. Link de reset para ${to}: ${resetUrl}`);
    return { sent: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Recuperação de senha - Emissor Etiquetas Low",
      html: `<p>Olá,</p><p>Recebemos um pedido para redefinir sua senha.</p><p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a></p><p>Se você não solicitou, ignore este e-mail.</p>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha ao enviar e-mail de recuperação: ${body}`);
  }

  return { sent: true };
}
