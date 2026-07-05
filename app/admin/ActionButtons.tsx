"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function ActionButton({
  label,
  busyLabel,
  url,
  confirmText,
  accent,
}: {
  label: string;
  busyLabel: string;
  url: string;
  confirmText: string;
  accent: "amber" | "sky";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(url, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Falló la operación");
      return;
    }
    router.refresh();
  }

  const cls =
    accent === "amber"
      ? "border-amber-400/50 text-amber-300 hover:bg-amber-400/10"
      : "border-sky-400/50 text-sky-300 hover:bg-sky-400/10";
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        onClick={run}
        disabled={busy}
        className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${cls}`}
      >
        {busy ? busyLabel : label}
      </button>
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </span>
  );
}

export function DrawButton({ lotteryId }: { lotteryId: string }) {
  return (
    <ActionButton
      label="Sortear"
      busyLabel="Sorteando…"
      url={`/api/lotteries/${lotteryId}/draw`}
      confirmText="¿Ejecutar el sorteo ahora? Es irreversible."
      accent="amber"
    />
  );
}

export function PayButton({ lotteryId }: { lotteryId: string }) {
  return (
    <ActionButton
      label="Marcar premio pagado"
      busyLabel="Guardando…"
      url={`/api/lotteries/${lotteryId}/pay`}
      confirmText="¿Confirmas que la transferencia al ganador ya está hecha?"
      accent="sky"
    />
  );
}
