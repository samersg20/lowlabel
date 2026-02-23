import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, unit: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const passwordHash = await bcrypt.hash(body.password, 10);
  const created = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash,
      role: body.role || "OPERATOR",
      unit: body.unit || "BROOKLIN",
    },
    select: { id: true, name: true, email: true, role: true, unit: true, createdAt: true },
  });
  return NextResponse.json(created);
}
