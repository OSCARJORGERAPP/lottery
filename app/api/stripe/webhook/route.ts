import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { assignTicketFromSession } from "@/lib/tickets";

/**
 * Camino canónico de asignación de boletos (RF-07): checkout.session.completed
 * con firma verificada. La lógica compartida (incluido el reembolso si el
 * número ya se vendió) vive en lib/tickets.ts.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET no configurado" }, { status: 500 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Falta la firma" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const payload = await req.text();
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await assignTicketFromSession(event.data.object);
  }
  return NextResponse.json({ received: true });
}
