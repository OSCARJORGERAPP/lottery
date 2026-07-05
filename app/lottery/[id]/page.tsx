import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getLottery, getSoldNumbers, getWinner } from "@/lib/lotteries";
import { isPurchaseOpen, totalPrize, PURCHASE_CUTOFF_MS } from "@/lib/lottery-logic";
import { formatDate, formatMoney, padNumber } from "@/lib/format";
import type { Ticket } from "@/lib/types";
import { assignTicketBySessionId, type AssignResult } from "@/lib/tickets";
import Countdown from "@/app/components/Countdown";
import StatusBadge from "@/app/components/StatusBadge";
import NumberGrid from "./NumberGrid";

export const dynamic = "force-dynamic";

export default async function LotteryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; cancelled?: string; session_id?: string }>;
}) {
  const { id } = await params;
  const { paid, cancelled, session_id } = await searchParams;
  const lottery = await getLottery(id);
  if (!lottery) notFound();

  // Vuelta del checkout: confirmar el pago contra Stripe y asignar el boleto
  // al momento (el webhook sigue siendo el camino canónico; esto es idempotente)
  let assignResult: AssignResult | null = null;
  if (paid && session_id) {
    try {
      assignResult = await assignTicketBySessionId(session_id);
    } catch {
      assignResult = null; // session_id inválido: el webhook lo resolverá
    }
  }

  const session = await getSession();
  const soldNumbers = await getSoldNumbers(lottery._id!);
  let myNumbers: number[] = [];
  if (session) {
    const db = await getDb();
    const mine = await db
      .collection<Ticket>("tickets")
      .find({ lotteryId: lottery._id!, userId: new ObjectId(session.userId) })
      .toArray();
    myNumbers = mine.map((t) => t.number);
  }
  const purchaseOpen = lottery.status === "open" && isPurchaseOpen(lottery.endDate);
  const closeAt = new Date(lottery.endDate.getTime() - PURCHASE_CUTOFF_MS);
  const winner = await getWinner(lottery);
  const iWon = session && lottery.winnerId && String(lottery.winnerId) === session.userId;

  return (
    <div className="space-y-8">
      {paid && assignResult === "duplicate_refunded" && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
          Ese número se vendió justo antes que tu pago. Te hemos devuelto el importe
          completo — elige otro número si quieres.
        </div>
      )}
      {paid && assignResult !== "duplicate_refunded" && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">
          {assignResult === "created" || assignResult === "already_assigned"
            ? "Pago confirmado: el número ya es tuyo (en ámbar en la rejilla)."
            : "Pago recibido. Tu número aparecerá en ámbar en cuanto Stripe confirme la compra — recarga la página en unos segundos."}
        </div>
      )}
      {cancelled && (
        <div className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
          Pago cancelado. Tu número sigue libre.
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{lottery.name}</h1>
            <StatusBadge status={lottery.status} />
          </div>
          <p className="text-zinc-400 text-sm">
            Sorteo: <span className="text-zinc-200">{formatDate(lottery.endDate)}</span>
            {lottery.status === "open" && (
              <>
                {" · "}venta cierra en <Countdown closeAtIso={closeAt.toISOString()} />
              </>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Premio</p>
          <p className="text-4xl font-bold text-amber-400 font-[family-name:var(--font-geist-mono)] tabular-nums">
            {formatMoney(totalPrize(lottery))}
          </p>
          {lottery.accumulatedPrize > 0 && (
            <p className="text-xs text-amber-300/80 mt-1">
              incluye {formatMoney(lottery.accumulatedPrize)} de bote
            </p>
          )}
          <p className="text-sm text-zinc-400 mt-1">
            boleto:{" "}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-zinc-200">
              {formatMoney(lottery.ticketPrice)}
            </span>
          </p>
        </div>
      </header>

      {lottery.status !== "open" && lottery.winningNumber !== undefined && (
        <section
          className={`rounded-xl border p-6 ${
            lottery.status === "deserted"
              ? "border-zinc-700 bg-zinc-900/60"
              : "border-amber-400/40 bg-amber-400/5"
          }`}
        >
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
            Número ganador
          </p>
          <p className="text-5xl font-bold font-[family-name:var(--font-geist-mono)] tabular-nums text-amber-400">
            {padNumber(lottery.winningNumber, lottery.totalNumbers)}
          </p>
          <p className="mt-3 text-sm text-zinc-300">
            {lottery.status === "deserted" ? (
              <>Nadie compró este número: el premio pasa al bote de la siguiente lotería.</>
            ) : iWon ? (
              <span className="text-amber-300 font-semibold">
                ¡Enhorabuena, es tu número! Recibirás {formatMoney(totalPrize(lottery))} por
                transferencia a tu cuenta{lottery.status === "paid" ? " (ya enviada)." : "."}
              </span>
            ) : (
              <>
                Ganador: <span className="text-zinc-100">{winner?.email ?? "—"}</span>
                {lottery.status === "paid"
                  ? " · premio transferido."
                  : " · transferencia pendiente."}
              </>
            )}
          </p>
        </section>
      )}

      <section>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">
          Números — {soldNumbers.length}/{lottery.totalNumbers} vendidos
        </h2>
        {!purchaseOpen && lottery.status === "open" && (
          <p className="mb-4 text-sm text-rose-300 border border-rose-500/30 bg-rose-500/5 rounded-md px-3 py-2">
            La venta está cerrada: el sorteo es en menos de 10 minutos.
          </p>
        )}
        <NumberGrid
          lotteryId={String(lottery._id)}
          totalNumbers={lottery.totalNumbers}
          soldNumbers={soldNumbers}
          myNumbers={myNumbers}
          purchaseOpen={purchaseOpen}
          loggedIn={!!session}
          priceLabel={formatMoney(lottery.ticketPrice)}
        />
      </section>
    </div>
  );
}
