import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listLotteries, getPot, getSoldNumbers } from "@/lib/lotteries";
import { hasEnded, totalPrize } from "@/lib/lottery-logic";
import { formatDate, formatMoney, padNumber } from "@/lib/format";
import type { User } from "@/lib/types";
import StatusBadge from "@/app/components/StatusBadge";
import CreateLotteryForm from "./CreateLotteryForm";
import { DrawButton, PayButton } from "./ActionButtons";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.isAdmin) redirect("/");

  const [lotteries, pot] = await Promise.all([listLotteries(), getPot()]);
  const db = await getDb();
  const winnerIds = lotteries.filter((l) => l.winnerId).map((l) => l.winnerId!);
  const winners = await db
    .collection<User>("users")
    .find({ _id: { $in: winnerIds } })
    .toArray();
  const winnerById = new Map(winners.map((w) => [String(w._id), w]));
  const soldCounts = new Map<string, number>();
  for (const l of lotteries) {
    soldCounts.set(String(l._id), (await getSoldNumbers(l._id!)).length);
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Administración</h1>
        {pot > 0 && (
          <p className="text-sm text-amber-300 border border-amber-400/30 bg-amber-400/5 rounded-md px-3 py-2">
            Bote pendiente: {formatMoney(pot)} — se sumará a la próxima lotería que crees
          </p>
        )}
      </header>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">Nueva lotería</h2>
        <CreateLotteryForm />
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">
          Loterías ({lotteries.length})
        </h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Lotería</th>
                <th className="px-4 py-3">Sorteo</th>
                <th className="px-4 py-3 text-right">Premio total</th>
                <th className="px-4 py-3 text-right">Vendidos</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Ganador</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {lotteries.map((l) => {
                const winner = l.winnerId ? winnerById.get(String(l.winnerId)) : null;
                const endDatePassed = hasEnded(l.endDate);
                return (
                  <tr key={String(l._id)} className="border-b border-zinc-800/60 last:border-0">
                    <td className="px-4 py-3 font-medium">{l.name}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatDate(l.endDate)}</td>
                    <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] tabular-nums text-amber-400">
                      {formatMoney(totalPrize(l))}
                    </td>
                    <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] tabular-nums text-zinc-300">
                      {soldCounts.get(String(l._id))}/{l.totalNumbers}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                      {l.winningNumber !== undefined && (
                        <span className="block mt-1 text-xs text-zinc-500 font-[family-name:var(--font-geist-mono)]">
                          nº {padNumber(l.winningNumber, l.totalNumbers)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {winner ? (
                        <>
                          {winner.email}
                          <span className="block text-xs text-zinc-500 font-[family-name:var(--font-geist-mono)]">
                            {winner.bankAccount ?? "⚠ sin IBAN — pedirle que lo añada"}
                          </span>
                        </>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {l.status === "open" &&
                        (endDatePassed ? (
                          <DrawButton lotteryId={String(l._id)} />
                        ) : (
                          <span className="text-xs text-zinc-600">esperando la fecha</span>
                        ))}
                      {l.status === "drawn" && <PayButton lotteryId={String(l._id)} />}
                      {(l.status === "paid" || l.status === "deserted") && (
                        <span className="text-xs text-zinc-600">cerrada</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {lotteries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    No hay loterías todavía. Crea la primera arriba.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
