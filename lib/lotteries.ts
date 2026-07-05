import { randomInt } from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { totalPrize, type CreateLotteryInput } from "./lottery-logic";
import type { Lottery, PotDoc, Ticket, User } from "./types";

export async function listLotteries(): Promise<Lottery[]> {
  const db = await getDb();
  // Abiertas primero (por cercanía del sorteo), luego el histórico
  const open = await db
    .collection<Lottery>("lotteries")
    .find({ status: "open" })
    .sort({ endDate: 1 })
    .toArray();
  const past = await db
    .collection<Lottery>("lotteries")
    .find({ status: { $ne: "open" } })
    .sort({ endDate: -1 })
    .toArray();
  return [...open, ...past];
}

export async function getLottery(id: string): Promise<Lottery | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  return db.collection<Lottery>("lotteries").findOne({ _id: new ObjectId(id) });
}

export async function getSoldNumbers(lotteryId: ObjectId): Promise<number[]> {
  const db = await getDb();
  const tickets = await db
    .collection<Ticket>("tickets")
    .find({ lotteryId }, { projection: { number: 1 } })
    .toArray();
  return tickets.map((t) => t.number);
}

/**
 * Crea una lotería (RF-02). Absorbe el bote pendiente de sorteos desiertos:
 * el pot pasa a accumulatedPrize y se vacía (RF-04).
 */
export async function createLottery(input: CreateLotteryInput): Promise<Lottery> {
  const db = await getDb();
  const pot = await db
    .collection<PotDoc>("config")
    .findOneAndUpdate({ _id: "pot" }, { $set: { amount: 0 } });
  const lottery: Lottery = {
    name: input.name.trim(),
    endDate: input.endDate,
    prize: input.prize,
    accumulatedPrize: pot?.amount ?? 0,
    ticketPrice: input.ticketPrice,
    totalNumbers: input.totalNumbers,
    status: "open",
    createdAt: new Date(),
  };
  const res = await db.collection<Lottery>("lotteries").insertOne(lottery);
  return { ...lottery, _id: res.insertedId };
}

/**
 * Sorteo (RF-09): elige un número aleatorio criptográficamente seguro.
 * Si el número fue vendido → drawn + ganador; si no → deserted y el premio
 * total va al bote (RF-04).
 */
export async function drawLottery(id: string): Promise<Lottery> {
  const db = await getDb();
  const lottery = await getLottery(id);
  if (!lottery) throw new Error("Lotería no encontrada");
  if (lottery.status !== "open") throw new Error("La lotería ya fue sorteada");
  if (lottery.endDate.getTime() > Date.now()) {
    throw new Error("Aún no ha llegado la fecha del sorteo");
  }

  const winningNumber = randomInt(1, lottery.totalNumbers + 1);
  const winningTicket = await db
    .collection<Ticket>("tickets")
    .findOne({ lotteryId: lottery._id!, number: winningNumber });

  if (winningTicket) {
    await db.collection<Lottery>("lotteries").updateOne(
      { _id: lottery._id, status: "open" },
      {
        $set: {
          status: "drawn",
          winningNumber,
          winnerId: winningTicket.userId,
          drawnAt: new Date(),
        },
      }
    );
  } else {
    // Desierto: el premio total (base + bote heredado) se acumula para la siguiente
    await db.collection<Lottery>("lotteries").updateOne(
      { _id: lottery._id, status: "open" },
      { $set: { status: "deserted", winningNumber, drawnAt: new Date() } }
    );
    await db
      .collection<PotDoc>("config")
      .updateOne({ _id: "pot" }, { $inc: { amount: totalPrize(lottery) } }, { upsert: true });
  }
  return (await getLottery(id))!;
}

/** Marca el premio como pagado por transferencia al ganador (RF-10). */
export async function markPrizePaid(id: string): Promise<void> {
  const db = await getDb();
  const res = await db
    .collection<Lottery>("lotteries")
    .updateOne({ _id: new ObjectId(id), status: "drawn" }, { $set: { status: "paid", paidAt: new Date() } });
  if (res.matchedCount === 0) {
    throw new Error("Solo se puede pagar una lotería sorteada con ganador");
  }
}

export async function getWinner(lottery: Lottery): Promise<User | null> {
  if (!lottery.winnerId) return null;
  const db = await getDb();
  return db.collection<User>("users").findOne({ _id: lottery.winnerId });
}

export async function getPot(): Promise<number> {
  const db = await getDb();
  const pot = await db.collection<PotDoc>("config").findOne({ _id: "pot" });
  return pot?.amount ?? 0;
}
