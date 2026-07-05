// Reconciliación: busca pagos completados en Stripe cuyo boleto no llegó a
// insertarse (p. ej. el webhook no estaba corriendo) y los asigna. Idempotente:
// el índice unique {lotteryId, number} ignora los ya insertados.
// Uso: npx tsx scripts/reconcile-payments.ts
import { MongoClient, ObjectId } from "mongodb";
import Stripe from "stripe";
import type { Payment, Ticket } from "../lib/types";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGO_DB ?? "lottery";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY no configurado");
  const stripe = new Stripe(key);
  const client = await new MongoClient(uri).connect();
  const db = client.db(dbName);

  const sessions = await stripe.checkout.sessions.list({ limit: 50 });
  let recovered = 0;
  for (const s of sessions.data) {
    if (s.payment_status !== "paid") continue;
    const { lotteryId, number, userId } = s.metadata ?? {};
    if (!lotteryId || !number || !userId) continue;

    const exists = await db
      .collection<Ticket>("tickets")
      .findOne({ stripeSessionId: s.id });
    if (exists) continue;

    try {
      await db.collection<Ticket>("tickets").insertOne({
        lotteryId: new ObjectId(lotteryId),
        number: Number(number),
        userId: new ObjectId(userId),
        stripeSessionId: s.id,
        purchasedAt: new Date(s.created * 1000),
      });
      await db.collection<Payment>("payments").insertOne({
        stripeSessionId: s.id,
        lotteryId: new ObjectId(lotteryId),
        userId: new ObjectId(userId),
        number: Number(number),
        amount: s.amount_total ?? 0,
        status: "completed",
        createdAt: new Date(),
      });
      recovered++;
      console.log(`✅ Boleto recuperado: nº ${number} (lotería ${lotteryId}, sesión ${s.id})`);
    } catch (e) {
      const isDuplicate = e instanceof Error && "code" in e && (e as { code: number }).code === 11000;
      if (!isDuplicate) throw e;
      console.log(`⚠️  nº ${number} ya estaba vendido en otra sesión — revisar reembolso (${s.id})`);
    }
  }
  console.log(recovered === 0 ? "Nada que reconciliar." : `${recovered} boleto(s) recuperado(s).`);
  await client.close();
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
