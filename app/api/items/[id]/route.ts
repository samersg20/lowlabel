import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type LegacyFlags = {
  methodQuente?: boolean;
  methodPistaFria?: boolean;
  methodDescongelando?: boolean;
  methodResfriado?: boolean;
  methodCongelado?: boolean;
  methodAmbienteSecos?: boolean;
};

function selectedMethodsFromLegacy(body: LegacyFlags) {
  const methods: string[] = [];
  if (Boolean(body.methodQuente)) methods.push("QUENTE");
  if (Boolean(body.methodPistaFria)) methods.push("PISTA FRIA");
  if (Boolean(body.methodDescongelando)) methods.push("DESCONGELANDO");
  if (Boolean(body.methodResfriado)) methods.push("RESFRIADO");
  if (Boolean(body.methodCongelado)) methods.push("CONGELADO");
  if (Boolean(body.methodAmbienteSecos)) methods.push("AMBIENTE");
  return methods;
}

function sanitizeSelectedMethods(body: any): string[] {
  if (Array.isArray(body.selectedMethods)) {
    const unique = Array.from(new Set(body.selectedMethods.map((m: any) => String(m || "").trim().toUpperCase()).filter((m: string) => Boolean(m)))) as string[];
    if (!unique.length) throw new Error("Selecione ao menos um método aplicável");
    return unique;
  }

  const legacy = selectedMethodsFromLegacy(body);
  if (!legacy.length) throw new Error("Selecione ao menos um método aplicável");
  return legacy;
}

function sanitizePreferredStorageMethod(body: any, enabledMethods: string[]): string {
  const preferred = typeof body.preferredStorageMethod === "string" ? body.preferredStorageMethod.trim().toUpperCase() : "";
  if (!preferred) {
    throw new Error("Método principal é obrigatório");
  }
  if (!enabledMethods.includes(preferred)) throw new Error("Método principal precisa estar habilitado");
  return preferred;
}

function legacyFlagsFromSelected(selectedMethods: string[]) {
  return {
    methodQuente: selectedMethods.includes("QUENTE"),
    methodPistaFria: selectedMethods.includes("PISTA FRIA"),
    methodDescongelando: selectedMethods.includes("DESCONGELANDO"),
    methodResfriado: selectedMethods.includes("RESFRIADO") || selectedMethods.includes("FRIO"),
    methodCongelado: selectedMethods.includes("CONGELADO"),
    methodAmbienteSecos: selectedMethods.includes("AMBIENTE") || selectedMethods.includes("AMBIENTE SECOS"),
  };
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();

  let selectedMethods: string[];
  let preferredStorageMethod: string;
  try {
    selectedMethods = sanitizeSelectedMethods(body);
    preferredStorageMethod = sanitizePreferredStorageMethod(body, selectedMethods);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Dados inválidos" }, { status: 400 });
  }

  const flags = legacyFlagsFromSelected(selectedMethods);

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
      ...flags,
      selectedMethods,
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
