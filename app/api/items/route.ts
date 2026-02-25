import { auth } from "@/lib/auth";
import { STORAGE_METHODS, type StorageMethod } from "@/lib/constants";
import { generateUniqueItemCode } from "@/lib/item-code";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function enabledMethodsFromBody(body: any): StorageMethod[] {
  const methods: StorageMethod[] = [];
  if (Boolean(body.methodQuente)) methods.push("QUENTE");
  if (Boolean(body.methodPistaFria)) methods.push("PISTA FRIA");
  if (Boolean(body.methodDescongelando)) methods.push("DESCONGELANDO");
  if (Boolean(body.methodResfriado)) methods.push("RESFRIADO");
  if (Boolean(body.methodCongelado)) methods.push("CONGELADO");
  if (Boolean(body.methodAmbienteSecos)) methods.push("AMBIENTE SECOS");
  return methods;
}

function sanitizePreferredStorageMethod(body: any): StorageMethod | null {
  const preferred = typeof body.preferredStorageMethod === "string" ? body.preferredStorageMethod.trim() : "";
  if (!preferred) return null;
  if (!STORAGE_METHODS.includes(preferred as StorageMethod)) throw new Error("Método preferencial inválido");
  const enabled = enabledMethodsFromBody(body);
  if (!enabled.includes(preferred as StorageMethod)) throw new Error("Método preferencial precisa estar habilitado");
  return preferred as StorageMethod;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  const items = await prisma.item.findMany({
    where: { tenantId: session.user.tenantId, ...(groupId ? { groupId } : {}) },
    include: { group: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  let preferredStorageMethod: StorageMethod | null;
  try {
    preferredStorageMethod = sanitizePreferredStorageMethod(body);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Dados inválidos" }, { status: 400 });
  }

  const created = await prisma.item.create({
    data: {
      tenantId: session.user.tenantId,
      itemCode: await generateUniqueItemCode(),
      name: String(body.name || "").trim().toUpperCase(),
      type: "GERAL",
      groupId: body.groupId || null,
      sif: body.sif || null,
      notes: body.notes || null,
      chilledHours: body.chilledHours,
      frozenHours: body.frozenHours,
      ambientHours: body.ambientHours,
      hotHours: body.hotHours,
      thawingHours: body.thawingHours,
      methodQuente: Boolean(body.methodQuente),
      methodPistaFria: Boolean(body.methodPistaFria),
      methodDescongelando: Boolean(body.methodDescongelando),
      methodResfriado: Boolean(body.methodResfriado),
      methodCongelado: Boolean(body.methodCongelado),
      methodAmbienteSecos: Boolean(body.methodAmbienteSecos),
      preferredStorageMethod,
    },
    include: { group: true },
  });

  return NextResponse.json(created);
}
