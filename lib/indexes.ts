import { Db } from "mongodb";

/** Índices obligatorios (ver AGENTS.md). Idempotente: seguro de re-ejecutar. */
export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  // Garantiza que un número no se vende dos veces (RF-07 / §5)
  await db
    .collection("tickets")
    .createIndex({ lotteryId: 1, number: 1 }, { unique: true });
  await db.collection("tickets").createIndex({ userId: 1 });
  await db.collection("lotteries").createIndex({ status: 1, endDate: 1 });
  await db
    .collection("payments")
    .createIndex({ stripeSessionId: 1 }, { unique: true });
  await db.collection("magic_links").createIndex({ tokenHash: 1 });
  // TTL: los magic links caducados se limpian solos
  await db
    .collection("magic_links")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 });
}
