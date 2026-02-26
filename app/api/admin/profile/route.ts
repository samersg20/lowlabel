import { NextResponse } from "next/server";
import { requireTenantSession } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";

export async function GET() {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  if (scoped.session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = tenantDb(scoped.tenantId);
  const tenant = await db.tenant.findFirst({ where: { id: scoped.tenantId } });
  return NextResponse.json(tenant);
}

export async function PUT(req: Request) {
  const scoped = await requireTenantSession();
  if ("error" in scoped) return scoped.error;
  if (scoped.session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const db = tenantDb(scoped.tenantId);
  const updated = await db.tenant.updateMany({
    where: { id: scoped.tenantId },
    data: {
      legalName: String(body.legalName || "").trim() || null,
      tradeName: String(body.tradeName || "").trim() || null,
      companyName: String(body.tradeName || body.companyName || "").trim() || "Minha Empresa",
      cnpj: String(body.cnpj || "").trim() || null,
      businessAddress: String(body.businessAddress || "").trim() || null,
      neighborhood: String(body.neighborhood || "").trim().toUpperCase() || null,
      city: String(body.city || "").trim() || null,
      state: String(body.state || "").trim() || null,
      zipCode: String(body.zipCode || "").trim() || null,
      stateRegistration: String(body.stateRegistration || "").trim() || null,
    },
  });

  const tenant = await db.tenant.findFirst({ where: { id: scoped.tenantId } });
  return NextResponse.json(tenant);
}
