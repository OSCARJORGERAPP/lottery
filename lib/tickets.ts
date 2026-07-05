import Stripe from "stripe";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { getStripe } from "./stripe";
import type { Payment, Ticket } from "./types";

export type AssignResult =
  | "created" // boleto asignado ahora
  | "already_assigned" // esta sesión ya tenía su boleto (reintento/webhook duplicado)
  | "duplicate_refunded" // el número lo ganó otra sesión: pago reembolsado
  | "ignored"; // sesión no pagada o sin metadata nuestra

/**
 * Único código que asigna boletos (RF-07). Lo invocan el webhook de Stripe y la
 * vuelta del checkout (success_url con session_id). Idempotente; el índice
 * unique {lotteryId, number} es la barrera final contra la doble venta (§5).
 */
export async function assignTicketFromSession(
  session: Stripe.Checkout.Session
): Promise<AssignResult> {
  if (session.payment_status !== "paid") return "ignored";
  const { lotteryId, number, userId } = session.metadata ?? {};
  if (!lotteryId || !number || !userId) return "ignored";

  const db = await getDb();
  const existing = await db
    .collection<Ticket>("tickets")
    .findOne({ stripeSessionId: session.id });
  if (existing) return "already_assigned";

  const payment: Payment = {
    stripeSessionId: session.id,
    lotteryId: new ObjectId(lotteryId),
    userId: new ObjectId(userId),
    number: Number(number),
    amount: session.amount_total ?? 0,
    status: "completed",
    createdAt: new Date(),
  };

  let result: AssignResult = "created";
  try {
    await db.collection<Ticket>("tickets").insertOne({
      lotteryId: new ObjectId(lotteryId),
      number: Number(number),
      userId: new ObjectId(userId),
      stripeSessionId: session.id,
      purchasedAt: new Date(),
    });
  } catch (e) {
    const isDuplicate =
      e instanceof Error && "code" in e && (e as { code: number }).code === 11000;
    if (!isDuplicate) throw e;
    // Doble venta bloqueada por el índice unique: reembolsar este pago
    payment.status = "duplicate";
    result = "duplicate_refunded";
    if (typeof session.payment_intent === "string") {
      await getStripe().refunds.create({ payment_intent: session.payment_intent });
    }
  }

  try {
    await db.collection<Payment>("payments").insertOne(payment);
  } catch {
    // Reintento (webhook + success_url a la vez): el payment ya existe, ok
  }
  return result;
}

/** Variante para la vuelta del checkout: recupera la sesión y asigna. */
export async function assignTicketBySessionId(sessionId: string): Promise<AssignResult> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  return assignTicketFromSession(session);
}
