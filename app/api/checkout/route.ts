import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { getLottery, getSoldNumbers } from "@/lib/lotteries";
import { isPurchaseOpen, isValidNumber } from "@/lib/lottery-logic";
import { getStripe } from "@/lib/stripe";
import { padNumber } from "@/lib/format";

/**
 * Compra de boleto (RF-07/RF-08): valida ventana y disponibilidad en el
 * SERVIDOR y crea la sesión de Stripe Checkout. El boleto NO se asigna aquí:
 * solo tras la confirmación del webhook (firma verificada).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();
    const { lotteryId, number } = await req.json();
    const lottery = await getLottery(String(lotteryId));
    if (!lottery) {
      return NextResponse.json({ error: "Lotería no encontrada" }, { status: 404 });
    }
    if (lottery.status !== "open" || !isPurchaseOpen(lottery.endDate)) {
      return NextResponse.json(
        { error: "La venta está cerrada: el sorteo es en menos de 10 minutos" },
        { status: 409 }
      );
    }
    if (!isValidNumber(Number(number), lottery.totalNumbers)) {
      return NextResponse.json({ error: "Número fuera de rango" }, { status: 400 });
    }
    const sold = await getSoldNumbers(lottery._id!);
    if (sold.includes(Number(number))) {
      return NextResponse.json({ error: "Ese número ya está vendido" }, { status: 409 });
    }

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const checkout = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: lottery.ticketPrice,
            product_data: {
              name: `${lottery.name} — boleto nº ${padNumber(Number(number), lottery.totalNumbers)}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        lotteryId: String(lottery._id),
        number: String(number),
        userId: session.userId,
      },
      success_url: `${appUrl}/lottery/${lottery._id}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/lottery/${lottery._id}?cancelled=1`,
    });
    return NextResponse.json({ url: checkout.url });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
