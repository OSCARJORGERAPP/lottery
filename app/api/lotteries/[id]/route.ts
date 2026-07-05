import { NextRequest, NextResponse } from "next/server";
import { getLottery, getSoldNumbers } from "@/lib/lotteries";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lottery = await getLottery(id);
  if (!lottery) {
    return NextResponse.json({ error: "Lotería no encontrada" }, { status: 404 });
  }
  const soldNumbers = await getSoldNumbers(lottery._id!);
  return NextResponse.json({ lottery, soldNumbers });
}
