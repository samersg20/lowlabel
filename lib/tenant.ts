import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireTenantSession() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) as NextResponse };
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return { error: NextResponse.json({ error: "tenant_not_configured" }, { status: 403 }) as NextResponse };
  }

  return { session, tenantId };
}

export function isStrongPassword(password: string) {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}
