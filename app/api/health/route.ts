import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/** Health check para la verificación post-deployment (AGENTS.md §Deployment). */
export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return NextResponse.json({ ok: true, db: "up" });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
