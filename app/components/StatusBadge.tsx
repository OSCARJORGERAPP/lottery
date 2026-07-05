import type { LotteryStatus } from "@/lib/types";

const styles: Record<LotteryStatus, { label: string; cls: string }> = {
  open: { label: "En venta", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  drawn: { label: "Sorteada — pago pendiente", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  deserted: { label: "Desierta — bote acumulado", cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" },
  paid: { label: "Premio pagado", cls: "bg-sky-500/10 text-sky-400 border-sky-500/30" },
};

export default function StatusBadge({ status }: { status: LotteryStatus }) {
  const s = styles[status];
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs ${s.cls}`}>
      {s.label}
    </span>
  );
}
