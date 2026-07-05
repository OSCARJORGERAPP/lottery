"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateLotteryForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/lotteries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        endDate: new Date(String(form.get("endDate"))).toISOString(),
        // La UI trabaja en euros; la API y la BD, en céntimos
        prize: Math.round(Number(form.get("prize")) * 100),
        ticketPrice: Math.round(Number(form.get("ticketPrice")) * 100),
        totalNumbers: Number(form.get("totalNumbers")),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear la lotería");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  const inputCls =
    "mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none";

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 max-w-2xl">
      <label className="block sm:col-span-2">
        <span className="text-sm text-zinc-300">Nombre</span>
        <input name="name" required minLength={3} placeholder="Sorteo de verano" className={inputCls} />
      </label>
      <label className="block">
        <span className="text-sm text-zinc-300">Fecha y hora del sorteo</span>
        <input name="endDate" type="datetime-local" required className={inputCls} />
      </label>
      <label className="block">
        <span className="text-sm text-zinc-300">Cantidad de números</span>
        <input name="totalNumbers" type="number" min={1} max={10000} required placeholder="100" className={inputCls} />
      </label>
      <label className="block">
        <span className="text-sm text-zinc-300">Premio (€)</span>
        <input name="prize" type="number" min={0.01} step="0.01" required placeholder="500" className={inputCls} />
      </label>
      <label className="block">
        <span className="text-sm text-zinc-300">Precio del boleto (€)</span>
        <input name="ticketPrice" type="number" min={0.01} step="0.01" required placeholder="5" className={inputCls} />
      </label>
      {error && <p className="text-sm text-rose-400 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-amber-400 text-zinc-950 font-semibold px-5 py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-40"
        >
          {busy ? "Creando…" : "Crear lotería"}
        </button>
      </div>
    </form>
  );
}
