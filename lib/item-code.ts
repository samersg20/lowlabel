import { prisma } from "@/lib/prisma";

function random6Digits() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function generateUniqueItemCode() {
  for (let i = 0; i < 50; i++) {
    const code = random6Digits();
    const exists = await prisma.item.findUnique({ where: { itemCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new Error("Não foi possível gerar código único do item");
}
