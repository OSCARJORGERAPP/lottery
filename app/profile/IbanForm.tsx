"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function IbanForm({ current }: { current: string | null }) {
  const router = useRouter();
  const [iban, setIban] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankAccount: iban }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-md">
      <label className="block">
        <span className="text-sm text-zinc-300">Cuenta bancaria (IBAN)</span>
        <input
          type="text"
          required
          value={iban}
          onChange={(e) => setIban(e.target.value)}
          placeholder="ES91 2100 0418 4502 0005 1332"
          className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 font-[family-name:var(--font-geist-mono)] text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
        />
      </label>
      <p className="text-xs text-zinc-500">
        Si ganas, el premio se transfiere a esta cuenta. Sin IBAN no podemos pagarte.
      </p>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {saved && <p className="text-sm text-emerald-400">Cuenta guardada.</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-zinc-100 text-zinc-950 font-semibold px-4 py-2 hover:bg-white transition-colors disabled:opacity-40"
      >
        {busy ? "Guardando…" : "Guardar cuenta"}
      </button>
    </form>
  );
}
