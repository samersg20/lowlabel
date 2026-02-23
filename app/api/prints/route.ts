import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { makeZplLabel } from "@/lib/zpl";
import { NextResponse } from "next/server";

function getShelfLife(item: any, method: string): number | null {
  switch (method) {
    case "RESFRIADO":
      return item.chilledHours;
    case "CONGELADO":
      return item.frozenHours;
    case "AMBIENTE":
      return item.ambientHours;
    case "QUENTE":
      return item.hotHours;
    case "DESCONGELANDO":
      return item.thawingHours;
    default:
      return null;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();

  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
    return NextResponse.json({ error: "Quantidade deve estar entre 1 e 50" }, { status: 400 });
  }

  const item = await prisma.item.findUnique({ where: { id: body.itemId } });
  if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  const shelfLifeHours = getShelfLife(item, body.storageMethod);
  if (!shelfLifeHours) {
    return NextResponse.json({ error: "Shelf life não cadastrado para este método" }, { status: 400 });
  }

  const producedAt = new Date();
  const expiresAt = new Date(producedAt.getTime() + shelfLifeHours * 60 * 60 * 1000);

  const print = await prisma.labelPrint.create({
    data: {
      itemId: item.id,
      storageMethod: body.storageMethod,
      producedAt,
      expiresAt,
      userId: session.user.id,
      quantity,
    },
  });

  const zpl = makeZplLabel({
    name: item.name,
    storageMethod: body.storageMethod,
    producedAt,
    expiresAt,
    userName: session.user.name,
    sif: item.sif,
    notes: item.notes,
  });

  return NextResponse.json({
    print,
    item,
    user: session.user,
    producedAt,
    expiresAt,
    storageMethod: body.storageMethod,
    zpl,
  });
}
