import { parseAiPrintOrder } from "@/lib/ai-print";
import { NextResponse } from "next/server";
import { withTenantTx } from "@/lib/tenant-tx";

const AI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";

export async function POST(req: Request) {
  try {
    return await withTenantTx(req, async ({ db, tenantId }) => {
      const body = await req.json();
      const input = String(body.input || "").trim();
      if (!input) return NextResponse.json({ error: "Texto da voz Ã© obrigatÃ³rio" }, { status: 400 });

      const parsed = await parseAiPrintOrder({ input, model: AI_TEXT_MODEL, maxQuantity: 10, tenantId, db });

      return NextResponse.json({
        ok: true,
        parsedText: parsed.map((row) => `${row.quantity} ${row.item.name.toUpperCase()} ${row.storageMethod.toLowerCase()}`).join("\n"),
        results: parsed.map((row) => ({ quantity: row.quantity, itemName: row.item.name, method: row.storageMethod })),
        model: AI_TEXT_MODEL,
      });
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Falha ao interpretar Falar" }, { status: 500 });
  }
}
