import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireUser, sessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isValidIban, normalizeIban } from "@/lib/lottery-logic";
import type { User } from "@/lib/types";

/** Guarda la cuenta bancaria (IBAN) del perfil (RF-06). */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireUser();
    const { bankAccount } = await req.json();
    if (typeof bankAccount !== "string" || !isValidIban(bankAccount)) {
      return NextResponse.json(
        { error: "El IBAN no es válido (formato: ES91 2100 0418 4502 0005 1332)" },
        { status: 400 }
      );
    }
    const db = await getDb();
    await db
      .collection<User>("users")
      .updateOne({ _id: sessionUserId(session) }, { $set: { bankAccount: normalizeIban(bankAccount) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
