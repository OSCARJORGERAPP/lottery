"use client";

import { useEffect, useState } from "react";

function label(msLeft: number): string {
  if (msLeft <= 0) return "cerrada";
  const s = Math.floor(msLeft / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

/** Cuenta atrás hasta el CIERRE DE VENTA (10 min antes del sorteo). */
export default function Countdown({ closeAtIso }: { closeAtIso: string }) {
  const closeAt = new Date(closeAtIso).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const msLeft = closeAt - now;
  return (
    // Contenido de reloj: el segundo renderizado en servidor difiere del
    // cliente por naturaleza — mismatch esperado y suprimido
    <span
      suppressHydrationWarning
      className={`font-[family-name:var(--font-geist-mono)] tabular-nums ${
        msLeft <= 0 ? "text-rose-400" : msLeft < 3600_000 ? "text-amber-300" : "text-zinc-300"
      }`}
    >
      {label(msLeft)}
    </span>
  );
}
