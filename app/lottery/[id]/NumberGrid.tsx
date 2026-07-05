"use client";

import { useState } from "react";

interface Props {
  lotteryId: string;
  totalNumbers: number;
  soldNumbers: number[];
  myNumbers: number[];
  purchaseOpen: boolean;
  loggedIn: boolean;
  priceLabel: string;
}

/**
 * Rejilla de números — el corazón de la página. Vendidos: apagados; los tuyos:
 * ámbar; libres: comprables con un clic (pasa por Stripe Checkout).
 */
export default function NumberGrid({
  lotteryId,
  totalNumbers,
  soldNumbers,
  myNumbers,
  purchaseOpen,
  loggedIn,
  priceLabel,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sold = new Set(soldNumbers);
  const mine = new Set(myNumbers);
  const width = String(totalNumbers).length;

  async function buy() {
    if (selected === null) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lotteryId, number: selected }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo iniciar el pago");
      setBusy(false);
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="space-y-4">
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(3.25rem, 1fr))" }}
      >
        {Array.from({ length: totalNumbers }, (_, i) => i + 1).map((n) => {
          const isSold = sold.has(n);
          const isMine = mine.has(n);
          const isSelected = selected === n;
          const base =
            "aspect-square rounded-md border text-sm font-[family-name:var(--font-geist-mono)] tabular-nums flex items-center justify-center transition-colors";
          if (isMine) {
            return (
              <span
                key={n}
                title="Tu boleto"
                className={`${base} border-amber-400 bg-amber-400/15 text-amber-300`}
              >
                {String(n).padStart(width, "0")}
              </span>
            );
          }
          if (isSold) {
            return (
              <span
                key={n}
                title="Vendido"
                className={`${base} border-zinc-800 bg-zinc-900 text-zinc-600 line-through`}
              >
                {String(n).padStart(width, "0")}
              </span>
            );
          }
          return (
            <button
              key={n}
              disabled={!purchaseOpen || busy}
              onClick={() => setSelected(isSelected ? null : n)}
              className={`${base} ${
                isSelected
                  ? "border-amber-400 bg-amber-400 text-zinc-950 font-bold"
                  : "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-amber-400/60 hover:text-amber-300"
              } disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400`}
            >
              {String(n).padStart(width, "0")}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-rose-400 border border-rose-500/30 bg-rose-500/5 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {purchaseOpen &&
        (loggedIn ? (
          <button
            onClick={buy}
            disabled={selected === null || busy}
            className="rounded-md bg-amber-400 text-zinc-950 font-semibold px-5 py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy
              ? "Abriendo el pago…"
              : selected === null
                ? "Elige un número libre"
                : `Comprar el ${String(selected).padStart(width, "0")} por ${priceLabel}`}
          </button>
        ) : (
          <p className="text-sm text-zinc-400">
            <a href="/login" className="text-amber-400 hover:text-amber-300 underline underline-offset-4">
              Entra con tu email
            </a>{" "}
            para comprar un número.
          </p>
        ))}
    </div>
  );
}
