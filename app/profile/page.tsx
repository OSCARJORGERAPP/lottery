import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDate, formatMoney, padNumber } from "@/lib/format";
import type { Lottery, Ticket, User } from "@/lib/types";
import StatusBadge from "@/app/components/StatusBadge";
import IbanForm from "./IbanForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const db = await getDb();
  const userId = new ObjectId(session.userId);
  const user = await db.collection<User>("users").findOne({ _id: userId });
  const tickets = await db
    .collection<Ticket>("tickets")
    .find({ userId })
    .sort({ purchasedAt: -1 })
    .toArray();
  const lotteryIds = [...new Set(tickets.map((t) => String(t.lotteryId)))].map(
    (id) => new ObjectId(id)
  );
  const lotteries = await db
    .collection<Lottery>("lotteries")
    .find({ _id: { $in: lotteryIds } })
    .toArray();
  const byId = new Map(lotteries.map((l) => [String(l._id), l]));

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold">Mis boletos</h1>
        <p className="text-zinc-400 text-sm mt-1">{session.email}</p>
      </header>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">
          Boletos ({tickets.length})
        </h2>
        {tickets.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Aún no tienes boletos.{" "}
            <Link href="/" className="text-amber-400 hover:text-amber-300 underline underline-offset-4">
              Mira los sorteos en venta
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-2">
            {tickets.map((t) => {
              const lottery = byId.get(String(t.lotteryId));
              if (!lottery) return null;
              const isWinner =
                lottery.winningNumber === t.number &&
                (lottery.status === "drawn" || lottery.status === "paid");
              return (
                <li key={String(t._id)}>
                  <Link
                    href={`/lottery/${t.lotteryId}`}
                    className={`flex flex-wrap items-center gap-4 rounded-lg border px-4 py-3 transition-colors ${
                      isWinner
                        ? "border-amber-400/60 bg-amber-400/10 hover:bg-amber-400/15"
                        : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                    }`}
                  >
                    <span
                      className={`text-xl font-bold font-[family-name:var(--font-geist-mono)] tabular-nums ${
                        isWinner ? "text-amber-300" : "text-zinc-100"
                      }`}
                    >
                      {padNumber(t.number, lottery.totalNumbers)}
                    </span>
                    <span className="text-sm text-zinc-300 flex-1">{lottery.name}</span>
                    {isWinner && (
                      <span className="text-xs font-semibold text-amber-300">
                        🏆 ¡Número ganador! {formatMoney(lottery.prize + lottery.accumulatedPrize)}
                      </span>
                    )}
                    <StatusBadge status={lottery.status} />
                    <span className="text-xs text-zinc-500">{formatDate(t.purchasedAt)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">
          Cuenta para recibir el premio
        </h2>
        <IbanForm current={user?.bankAccount ?? null} />
      </section>
    </div>
  );
}
