import { auth } from "@/lib/auth";
import { STORAGE_METHODS, type StorageMethod } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function enabledMethodsFromBody(body: any): StorageMethod[] {
  const methods: StorageMethod[] = [];
  if (Boolean(body.methodQuente)) methods.push("QUENTE");
  if (Boolean(body.methodPistaFria)) methods.push("PISTA FRIA");
  if (Boolean(body.methodDescongelando)) methods.push("DESCONGELANDO");
  if (Boolean(body.methodResfriado)) methods.push("RESFRIADO");
  if (Boolean(body.methodCongelado)) methods.push("CONGELADO");
  if (Boolean(body.methodAmbienteSecos)) methods.push("AMBIENTE");
  return methods;
}

function ensureAtLeastOneEnabledMethod(body: any) {
  const enabled = enabledMethodsFromBody(body);
  if (!enabled.length) throw new Error("Selecione ao menos um método aplicável");
}


function sanitizePreferredStorageMethod(body: any): StorageMethod | null {
  const preferred = typeof body.preferredStorageMethod === "string" ? body.preferredStorageMethod.trim() : "";
  if (!preferred) {
    throw new Error("Método principal é obrigatório");
  }
  if (!STORAGE_METHODS.includes(preferred as StorageMethod)) throw new Error("Método preferencial inválido");
  const enabled = enabledMethodsFromBody(body);
  if (!enabled.includes(preferred as StorageMethod)) throw new Error("Método preferencial precisa estar habilitado");
  return preferred as StorageMethod;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();

  let preferredStorageMethod: StorageMethod | null;
  try {
    ensureAtLeastOneEnabledMethod(body);
    preferredStorageMethod = sanitizePreferredStorageMethod(body);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Dados inválidos" }, { status: 400 });
  }

  const updated = await prisma.item.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: {
      name: String(body.name || "").trim().toUpperCase(),
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
  });

  if (!updated.count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const row = await prisma.item.findUnique({ where: { id: params.id }, include: { group: true } });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const deleted = await prisma.item.deleteMany({ where: { id: params.id, tenantId: session.user.tenantId } });
  if (!deleted.count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
