import { auth } from "@/lib/auth";
import { processAiPrintOrder } from "@/lib/ai-print";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const input = String(body.input || "").trim();
    if (!input) return NextResponse.json({ error: "Texto é obrigatório" }, { status: 400 });

    const results = await processAiPrintOrder({
      input,
      sessionUser: session.user,
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      maxQuantity: 10,
    });

    return NextResponse.json({ ok: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Falha ao emitir DIGITAR" }, { status: 500 });
  }
}
