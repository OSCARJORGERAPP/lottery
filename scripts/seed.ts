// Seed de datos (RF-11): admin, usuarios, loterías en varios estados y boletos.
// Uso: npm run seed | npm run seed:reset (limpia y re-siembra)
import { MongoClient, ObjectId } from "mongodb";
import { ensureIndexes } from "../lib/indexes";
import type { Lottery, Ticket, User } from "../lib/types";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGO_DB ?? "lottery";
const reset = process.argv.includes("--reset");

const DAY = 24 * 60 * 60 * 1000;

async function main() {
  const client = await new MongoClient(uri).connect();
  const db = client.db(dbName);

  if (reset) {
    await db.dropDatabase();
    console.log("🗑️  Base de datos limpiada");
  }

  await ensureIndexes(db);
  console.log("📇 Índices creados (unique lotteryId+number incluido)");

  const existing = await db.collection("users").countDocuments();
  if (existing > 0 && !reset) {
    console.log("La BD ya tiene datos. Usa `npm run seed:reset` para re-sembrar.");
    await client.close();
    return;
  }

  const now = Date.now();
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@lottery.dev";
  const users: User[] = [
    { email: adminEmail, isAdmin: true, createdAt: new Date() },
    {
      email: "ana@example.com",
      isAdmin: false,
      bankAccount: "ES9121000418450200051332",
      createdAt: new Date(),
    },
    {
      email: "bruno@example.com",
      isAdmin: false,
      bankAccount: "ES7921000813610123456789",
      createdAt: new Date(),
    },
    { email: "carla@example.com", isAdmin: false, createdAt: new Date() },
  ];
  const userIds = (await db.collection<User>("users").insertMany(users)).insertedIds;
  const ana = userIds[1];
  const bruno = userIds[2];
  const carla = userIds[3];
  console.log(`👤 ${users.length} usuarios (admin: ${adminEmail})`);

  const lotteries: Lottery[] = [
    {
      name: "Sorteo de verano",
      endDate: new Date(now + 7 * DAY),
      prize: 50000, // 500 €
      accumulatedPrize: 0,
      ticketPrice: 500, // 5 €
      totalNumbers: 100,
      status: "open",
      createdAt: new Date(now - 2 * DAY),
    },
    {
      name: "Gran bote exprés",
      endDate: new Date(now + 1 * DAY),
      prize: 100000, // 1000 €
      accumulatedPrize: 25000, // hereda 250 € de bote
      ticketPrice: 1000, // 10 €
      totalNumbers: 50,
      status: "open",
      createdAt: new Date(now - 1 * DAY),
    },
    {
      name: "Sorteo de primavera",
      endDate: new Date(now - 10 * DAY),
      prize: 30000,
      accumulatedPrize: 0,
      ticketPrice: 300,
      totalNumbers: 20,
      status: "paid",
      winningNumber: 7,
      drawnAt: new Date(now - 10 * DAY),
      paidAt: new Date(now - 8 * DAY),
      createdAt: new Date(now - 30 * DAY),
    },
    {
      name: "Sorteo relámpago",
      endDate: new Date(now - 3 * DAY),
      prize: 20000,
      accumulatedPrize: 5000,
      ticketPrice: 200,
      totalNumbers: 200,
      status: "deserted",
      winningNumber: 137,
      drawnAt: new Date(now - 3 * DAY),
      createdAt: new Date(now - 15 * DAY),
    },
  ];
  const lotteryIds = (await db.collection<Lottery>("lotteries").insertMany(lotteries))
    .insertedIds;
  console.log(`🎟️  ${lotteries.length} loterías (2 abiertas, 1 pagada, 1 desierta)`);

  // El sorteo desierto dejó su premio total (200 € + 50 €) en el bote
  await db.collection("config").insertOne({ _id: "pot" as never, amount: 25000 });
  console.log("💰 Bote pendiente: 250 €");

  const buyers = [ana, bruno, carla];
  const tickets: Ticket[] = [];
  const buy = (lottery: ObjectId, number: number, user: ObjectId) =>
    tickets.push({
      lotteryId: lottery,
      number,
      userId: user,
      stripeSessionId: `seed_${String(lottery)}_${number}`,
      purchasedAt: new Date(now - Math.floor(Math.random() * DAY)),
    });

  // Verano: 18 números vendidos
  for (let n = 1; n <= 18; n++) buy(lotteryIds[0], n * 5 - 2, buyers[n % 3]);
  // Exprés: 12 vendidos
  for (let n = 1; n <= 12; n++) buy(lotteryIds[1], n * 4 - 1, buyers[n % 3]);
  // Primavera (pagada): el 7 ganador fue de Ana
  buy(lotteryIds[2], 7, ana);
  buy(lotteryIds[2], 3, bruno);
  buy(lotteryIds[2], 15, carla);
  // Relámpago (desierta): nadie tenía el 137
  buy(lotteryIds[3], 42, ana);
  buy(lotteryIds[3], 99, bruno);

  await db.collection<Ticket>("tickets").insertMany(tickets);
  await db
    .collection<Lottery>("lotteries")
    .updateOne({ _id: lotteryIds[2] }, { $set: { winnerId: ana } });
  console.log(`🎫 ${tickets.length} boletos de ejemplo`);

  console.log("\n✅ Seed completado. Entra con cualquier email; el admin es:", adminEmail);
  await client.close();
}

main().catch((e) => {
  console.error("❌ Seed falló:", e.message);
  process.exit(1);
});
