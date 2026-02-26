import { NextResponse } from "next/server";
import { STORAGE_METHOD_RULES } from "@/lib/constants";
import { submitRawZplToPrintNode } from "@/lib/printnode";
import { makeZplLabel } from "@/lib/zpl";
import { withTenantTx } from "@/lib/tenant-tx";
import { requireUnitForTenant } from "@/lib/unit-validation";

function legacyMethods(item: any) {
  const methods: string[] = [];
  if (item.methodQuente) methods.push("QUENTE");
  if (item.methodPistaFria) methods.push("PISTA FRIA");
  if (item.methodDescongelando) methods.push("DESCONGELANDO");
  if (item.methodResfriado) methods.push("RESFRIADO");
  if (item.methodCongelado) methods.push("CONGELADO");
  if (item.methodAmbienteSecos) methods.push("AMBIENTE");
  return methods;
}

export async function POST(req: Request) {
  try {
    return await withTenantTx(req, async ({ db, tenantId, session }) => {
      const body = await req.json();
      const quantity = Number(body.quantity);

      if (!body.itemId || !body.storageMethod || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return NextResponse.json({ error: "Dados invÃ¡lidos (itemId/storageMethod/quantity)" }, { status: 400 });
      }

      try {
        await requireUnitForTenant(db, session.user.unit);
      } catch {
        return NextResponse.json({ error: "Unidade invÃ¡lida" }, { status: 400 });
      }

      const item = await db.item.findFirst({ where: { id: body.itemId } });
      if (!item) return NextResponse.json({ error: "Item nÃ£o encontrado" }, { status: 404 });

      const selectedMethods = (Array.isArray(item.selectedMethods) && item.selectedMethods.length
        ? item.selectedMethods
        : legacyMethods(item)).map((m: string) => String(m || "").trim().toUpperCase());

      const requestedMethod = String(body.storageMethod || "").trim().toUpperCase();
      if (!selectedMethods.includes(requestedMethod)) {
        return NextResponse.json({ error: "MÃ©todo nÃ£o habilitado para este item" }, { status: 400 });
      }

      const methodConfig = await db.method.findFirst({
        where: { name: requestedMethod },
        select: { durationValue: true, durationUnit: true },
      });

      const fallback = STORAGE_METHOD_RULES[requestedMethod as keyof typeof STORAGE_METHOD_RULES];
      if (!methodConfig && !fallback) return NextResponse.json({ error: "MÃ©todo invÃ¡lido" }, { status: 400 });

      const producedAt = new Date();
      const amount = methodConfig?.durationValue ?? fallback!.amount;
      const unit = methodConfig?.durationUnit ?? fallback!.unit;
      const multiplier = unit === "hours" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const expiresAt = new Date(producedAt.getTime() + amount * multiplier);

      const print = await db.labelPrint.create({
        data: {
          tenantId,
          itemId: item.id,
          storageMethod: requestedMethod as any,
          producedAt,
          expiresAt,
          userId: session.user.id,
          quantity,
        },
      });

      const zpl = makeZplLabel({ name: item.name, storageMethod: requestedMethod as any, producedAt, expiresAt, userName: session.user.name || "ADMIN", sif: item.sif });

      const printerConfig = await db.printerConfig.findFirst({ where: { unit: session.user.unit, isActive: true } });

      const printerId = printerConfig?.printerId || Number(process.env.PRINTNODE_PRINTER_ID || process.env.PRINTNODE_PRINT_ID || 0);
      const apiKey = printerConfig?.apiKey || process.env.PRINTNODE_API_KEY || "";

      if (!printerId || !apiKey) {
        return NextResponse.json({ error: "Impressora nÃ£o configurada para a unidade do usuÃ¡rio" }, { status: 400 });
      }

      const jobIds = await submitRawZplToPrintNode(zpl, quantity, `Etiqueta ${item.name}`, { apiKey, printerId });

      return NextResponse.json({ ok: true, printId: print.id, quantity, jobIds });
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Falha ao emitir etiqueta" }, { status: 500 });
  }
}
