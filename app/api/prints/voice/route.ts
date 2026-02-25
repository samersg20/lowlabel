import { auth } from "@/lib/auth";
import { processAiPrintOrder } from "@/lib/ai-print";
import { NextResponse } from "next/server";

const AI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const input = String(body.input || "").trim();
    if (!input) return NextResponse.json({ error: "Texto da voz é obrigatório" }, { status: 400 });

    const results = await processAiPrintOrder({
      input,
      sessionUser: session.user,
      model: AI_TEXT_MODEL,
      maxQuantity: 10,
    });

    return NextResponse.json({ ok: true, results, model: AI_TEXT_MODEL });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Falha ao emitir FALAR" }, { status: 500 });
  }
}
