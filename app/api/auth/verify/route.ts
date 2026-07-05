import { NextRequest, NextResponse } from "next/server";
import { consumeMagicLink, createSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (!token) {
    return NextResponse.redirect(`${appUrl}/login?error=token`);
  }
  const user = await consumeMagicLink(token);
  if (!user) {
    // Enlace inválido, caducado o ya usado
    return NextResponse.redirect(`${appUrl}/login?error=expired`);
  }
  await createSession(user);
  return NextResponse.redirect(appUrl);
}
