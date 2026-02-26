import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Endpoint descontinuado. Use /api/prints/magic" }, { status: 410 });
}
