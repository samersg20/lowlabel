import { processAiPrintOrder } from "@/lib/ai-print";
import { NextResponse } from "next/server";
import { withTenantTx } from "@/lib/tenant-tx";

const AI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";

export async function POST(req: Request) {
  try {
    return await withTenantTx(req, async ({ db, tenantId, session }) => {
      const body = await req.json();
      const input = String(body.input || "").trim();
      if (!input) return NextResponse.json({ error: "Texto Ã© obrigatÃ³rio" }, { status: 400 });

      const results = await processAiPrintOrder({
        input,
        sessionUser: { ...session.user, tenantId },
        model: AI_TEXT_MODEL,
        maxQuantity: 10,
        db,
      });

      return NextResponse.json({ ok: true, results, model: AI_TEXT_MODEL });
    });
  } catch (error: any) {
    const message = error?.message || "Falha ao emitir DIGITAR";
    const status = message === "Unidade invÃ¡lida" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
