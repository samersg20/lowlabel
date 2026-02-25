import { auth } from "@/lib/auth";
import { STORAGE_METHOD_RULES, type StorageMethod } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { makeZplLabel } from "@/lib/zpl";
import { submitRawZplToPrintNode } from "@/lib/printnode";
import { NextResponse } from "next/server";

function isMethodEnabledForItem(item: any, method: StorageMethod): boolean {
  switch (method) {
    case "QUENTE":
      return Boolean(item.methodQuente);
    case "PISTA FRIA":
      return Boolean(item.methodPistaFria);
    case "DESCONGELANDO":
      return Boolean(item.methodDescongelando);
    case "RESFRIADO":
      return Boolean(item.methodResfriado);
    case "CONGELADO":
      return Boolean(item.methodCongelado);
    case "AMBIENTE SECOS":
      return Boolean(item.methodAmbienteSecos);
    default:
      return false;
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = await req.json();

    const quantity = Number(body.quantity);
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return NextResponse.json({ error: "Quantidade deve estar entre 1 e 20" }, { status: 400 });
    }

    const storageMethod = body.storageMethod as StorageMethod;
    const methodRule = STORAGE_METHOD_RULES[storageMethod];
    if (!methodRule) {
      return NextResponse.json({ error: "Método inválido" }, { status: 400 });
    }

    const item = await prisma.item.findUnique({ where: { id: body.itemId } });
    if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

    if (!isMethodEnabledForItem(item, storageMethod)) {
      return NextResponse.json({ error: "Método não habilitado para este produto" }, { status: 400 });
    }

    const producedAt = new Date();
    const multiplier = methodRule.unit === "hours" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = new Date(producedAt.getTime() + methodRule.amount * multiplier);

    const print = await prisma.labelPrint.create({
      data: {
        itemId: item.id,
        storageMethod,
        producedAt,
        expiresAt,
        userId: session.user.id,
        quantity,
      },
    });

    const printerConfig = await prisma.printerConfig.findFirst({ where: { unit: session.user.unit, isActive: true } });

    const zpl = makeZplLabel({
      name: item.name,
      storageMethod,
      producedAt,
      expiresAt,
      userName: session.user.name,
      sif: item.sif,
    });

    const jobIds = await submitRawZplToPrintNode(
      zpl,
      quantity,
      `Etiqueta ${item.name} - ${storageMethod}`,
      printerConfig ? { apiKey: printerConfig.apiKey, printerId: printerConfig.printerId } : undefined,
    );

    return NextResponse.json({
      print,
      item,
      user: session.user,
      producedAt,
      expiresAt,
      storageMethod,
      jobIds,
      printerUnit: session.user.unit,
      printerSource: printerConfig ? "cadastro" : "env",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Falha ao emitir etiqueta" }, { status: 500 });
  }
}
