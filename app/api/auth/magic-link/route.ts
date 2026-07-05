import { NextRequest, NextResponse } from "next/server";
import { requestMagicLink } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (typeof email !== "string") {
      return NextResponse.json({ error: "Falta el email" }, { status: 400 });
    }
    const url = await requestMagicLink(email);
    // Solo en desarrollo: exponer el enlace en la respuesta para poder entrar
    // sin acceso a la consola del servidor. En producción se envía por email.
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ ok: true, devUrl: url });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
