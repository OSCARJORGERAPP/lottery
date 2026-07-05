import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth";
import { createLottery, listLotteries } from "@/lib/lotteries";
import { validateLotteryInput } from "@/lib/lottery-logic";

export async function GET() {
  const lotteries = await listLotteries();
  return NextResponse.json({ lotteries });
}

/** Solo el admin crea loterías (RF-01/RF-02). */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const input = {
      name: String(body.name ?? ""),
      endDate: new Date(body.endDate),
      prize: Math.round(Number(body.prize)),
      ticketPrice: Math.round(Number(body.ticketPrice)),
      totalNumbers: Number(body.totalNumbers),
    };
    const errors = validateLotteryInput(input);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(". ") }, { status: 400 });
    }
    const lottery = await createLottery(input);
    return NextResponse.json({ lottery }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
