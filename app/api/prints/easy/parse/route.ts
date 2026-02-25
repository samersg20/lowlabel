import { auth } from "@/lib/auth";
import { parseAiPrintOrder } from "@/lib/ai-print";
import { NextResponse } from "next/server";

const EASY_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = await req.json();
    const input = String(body.input || "").trim();
    if (!input) return NextResponse.json({ error: "Texto é obrigatório" }, { status: 400 });

    const parsed = await parseAiPrintOrder({ input, model: EASY_GEMINI_MODEL, maxQuantity: 10 });
    return NextResponse.json({
      ok: true,
      parsedText: parsed.map((row) => `${row.quantity} ${row.item.name.toUpperCase()} ${row.storageMethod.toLowerCase()}`).join("\n"),
      results: parsed.map((row) => ({ quantity: row.quantity, itemName: row.item.name, method: row.storageMethod })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Falha ao interpretar Digitar" }, { status: 500 });
  }
}
