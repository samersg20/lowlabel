import { NextResponse } from "next/server";
import { withTenantTx } from "@/lib/tenant-tx";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return withTenantTx(_req, async ({ db, session }) => {
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const deleted = await db.itemAlias.deleteMany({ where: { id: params.id } });
    if (!deleted.count) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  });
}
