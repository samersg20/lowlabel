import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { STORAGE_METHOD_RULES } from "@/lib/constants";
import { submitRawZplToPrintNode } from "@/lib/printnode";
import { makeZplLabel } from "@/lib/zpl";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const quantity = Number(body.quantity);

    if (!body.itemId || !body.storageMethod || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return NextResponse.json({ error: "Dados inválidos (itemId/storageMethod/quantity)" }, { status: 400 });
    }

    const item = await prisma.item.findFirst({ where: { id: body.itemId, tenantId: session.user.tenantId } });
    if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

    const methodRule = STORAGE_METHOD_RULES[body.storageMethod as keyof typeof STORAGE_METHOD_RULES];
    if (!methodRule) return NextResponse.json({ error: "Método inválido" }, { status: 400 });

    const producedAt = new Date();
    const multiplier = methodRule.unit === "hours" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = new Date(producedAt.getTime() + methodRule.amount * multiplier);

    const print = await prisma.labelPrint.create({
      data: {
        tenantId: session.user.tenantId,
        itemId: item.id,
        storageMethod: body.storageMethod,
        producedAt,
        expiresAt,
        userId: session.user.id,
        quantity,
      },
    });

    const zpl = makeZplLabel({ name: item.name, storageMethod: body.storageMethod, producedAt, expiresAt, userName: session.user.name || "ADMIN", sif: item.sif });

    const printerConfig = await prisma.printerConfig.findFirst({ where: { tenantId: session.user.tenantId, unit: session.user.unit, isActive: true } });

    const printerId = printerConfig?.printerId || Number(process.env.PRINTNODE_PRINTER_ID || process.env.PRINTNODE_PRINT_ID || 0);
    const apiKey = printerConfig?.apiKey || process.env.PRINTNODE_API_KEY || "";

    if (!printerId || !apiKey) {
      return NextResponse.json({ error: "Impressora não configurada para a unidade do usuário" }, { status: 400 });
    }

    const jobIds = await submitRawZplToPrintNode(zpl, quantity, `Etiqueta ${item.name}`, { apiKey, printerId });

    return NextResponse.json({ ok: true, printId: print.id, quantity, jobIds });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Falha ao emitir etiqueta" }, { status: 500 });
  }
}
