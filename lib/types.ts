import { ObjectId } from "mongodb";

export type LotteryStatus = "open" | "drawn" | "deserted" | "paid";

export interface User {
  _id?: ObjectId;
  email: string;
  isAdmin: boolean;
  bankAccount?: string; // IBAN para recibir el premio
  createdAt: Date;
}

export interface Lottery {
  _id?: ObjectId;
  name: string;
  endDate: Date;
  prize: number; // céntimos
  accumulatedPrize: number; // céntimos, bote heredado de sorteos desiertos
  ticketPrice: number; // céntimos
  totalNumbers: number;
  status: LotteryStatus;
  winningNumber?: number;
  winnerId?: ObjectId;
  drawnAt?: Date;
  paidAt?: Date;
  createdAt: Date;
}

export interface Ticket {
  _id?: ObjectId;
  lotteryId: ObjectId;
  number: number;
  userId: ObjectId;
  stripeSessionId: string;
  purchasedAt: Date;
}

export interface Payment {
  _id?: ObjectId;
  stripeSessionId: string;
  lotteryId: ObjectId;
  userId: ObjectId;
  number: number;
  amount: number; // céntimos
  status: "completed" | "duplicate";
  createdAt: Date;
}

export interface MagicLink {
  _id?: ObjectId;
  tokenHash: string;
  email: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

export interface PotDoc {
  _id: string; // "pot"
  amount: number; // céntimos acumulados de sorteos desiertos
}

export interface SessionUser {
  userId: string;
  email: string;
  isAdmin: boolean;
}
