import Link from "next/link";
import { listLotteries, getSoldNumbers, getPot } from "@/lib/lotteries";
import { totalPrize, PURCHASE_CUTOFF_MS } from "@/lib/lottery-logic";
import { formatMoney, formatDate } from "@/lib/format";
import type { Lottery } from "@/lib/types";
import Countdown from "./components/Countdown";
import StatusBadge from "./components/StatusBadge";

export const dynamic = "force-dynamic";

async function LotteryCard({ lottery }: { lottery: Lottery }) {
  const sold = lottery.status === "open" ? (await getSoldNumbers(lottery._id!)).length : null;
  const closeAt = new Date(lottery.endDate.getTime() - PURCHASE_CUTOFF_MS);
  return (
    <Link
      href={`/lottery/${lottery._id}`}
      className="group rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-amber-400/50 hover:bg-zinc-900 transition-colors flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-lg leading-tight group-hover:text-amber-300 transition-colors">
          {lottery.name}
        </h3>
        <StatusBadge status={lottery.status} />
      </div>
      <p className="text-3xl font-bold text-amber-400 font-[family-name:var(--font-geist-mono)] tabular-nums">
        {formatMoney(totalPrize(lottery))}
      </p>
      {lottery.accumulatedPrize > 0 && (
        <p className="text-xs text-amber-300/80">
          incluye {formatMoney(lottery.accumulatedPrize)} de bote acumulado
        </p>
      )}
      <dl className="text-sm text-zinc-400 space-y-1">
        <div className="flex justify-between">
          <dt>Boleto</dt>
          <dd className="font-[family-name:var(--font-geist-mono)] tabular-nums text-zinc-200">
            {formatMoney(lottery.ticketPrice)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Sorteo</dt>
          <dd className="text-zinc-200">{formatDate(lottery.endDate)}</dd>
        </div>
        {lottery.status === "open" && sold !== null && (
          <>
            <div className="flex justify-between">
              <dt>Vendidos</dt>
              <dd className="font-[family-name:var(--font-geist-mono)] tabular-nums text-zinc-200">
                {sold}/{lottery.totalNumbers}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Venta cierra en</dt>
              <dd>
                <Countdown closeAtIso={closeAt.toISOString()} />
              </dd>
            </div>
          </>
        )}
      </dl>
      {lottery.status === "open" && (
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden mt-auto">
          <div
            className="h-full bg-amber-400/80"
            style={{ width: `${((sold ?? 0) / lottery.totalNumbers) * 100}%` }}
          />
        </div>
      )}
    </Link>
  );
}

export default async function HomePage() {
  let lotteries: Lottery[] = [];
  let pot = 0;
  let dbError = false;
  try {
    [lotteries, pot] = await Promise.all([listLotteries(), getPot()]);
  } catch {
    dbError = true;
  }

  const open = lotteries.filter((l) => l.status === "open");
  const past = lotteries.filter((l) => l.status !== "open");
  const next = open[0];

  return (
    <div className="space-y-12">
      <section className="pt-4">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-400 mb-3 font-[family-name:var(--font-geist-mono)]">
          un número · un premio · un ganador
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight max-w-2xl">
          Elige tu número.
          <br />
          El resto es <span className="text-amber-400">suerte</span>.
        </h1>
        <p className="text-zinc-400 mt-4 max-w-xl">
          Compra un número de la lotería que quieras, espera al sorteo y, si sale el tuyo,
          recibes el premio por transferencia a tu cuenta.
        </p>
        {next && (
          <p className="mt-5 text-sm text-zinc-400">
            Próximo sorteo: <span className="text-zinc-100">{next.name}</span> —{" "}
            <span className="text-amber-400 font-semibold font-[family-name:var(--font-geist-mono)] tabular-nums">
              {formatMoney(totalPrize(next))}
            </span>{" "}
            en juego
          </p>
        )}
        {pot > 0 && open.length === 0 && (
          <p className="mt-5 text-sm text-amber-300">
            Hay un bote de {formatMoney(pot)} esperando a la próxima lotería.
          </p>
        )}
      </section>

      {dbError ? (
        <section className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-sm text-rose-300">
          No se puede conectar con la base de datos. Comprueba que MongoDB está corriendo
          en 127.0.0.1:27017 y ejecuta{" "}
          <code className="font-[family-name:var(--font-geist-mono)]">npm run seed</code>.
        </section>
      ) : (
        <>
          <section>
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">
              Sorteos en venta
            </h2>
            {open.length === 0 ? (
              <p className="text-zinc-500 text-sm">
                Ahora mismo no hay sorteos en venta. Vuelve pronto.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {open.map((l) => (
                  <LotteryCard key={String(l._id)} lottery={l} />
                ))}
              </div>
            )}
          </section>
          {past.length > 0 && (
            <section>
              <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">
                Sorteos anteriores
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((l) => (
                  <LotteryCard key={String(l._id)} lottery={l} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
