"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError === "expired"
      ? "Ese enlace ya caducó o ya se usó. Pide uno nuevo."
      : urlError === "token"
        ? "El enlace no es válido. Pide uno nuevo."
        : null
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo enviar el enlace");
      return;
    }
    setSent(true);
    setDevUrl(data.devUrl ?? null);
  }

  return (
    <div className="max-w-md mx-auto pt-8">
      <h1 className="text-3xl font-bold mb-2">Entrar</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Sin contraseñas: te enviamos un enlace de un solo uso a tu email.
      </p>

      {sent ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-sm text-emerald-300">
          <p className="font-semibold mb-1">Enlace enviado a {email}</p>
          <p className="text-emerald-300/80">Ábrelo en los próximos 15 minutos.</p>
          {devUrl && (
            <a
              href={devUrl}
              className="mt-4 inline-block rounded-md bg-amber-400 px-4 py-2 font-semibold text-zinc-950 hover:bg-amber-300 transition-colors"
            >
              Modo desarrollo: entrar ahora →
            </a>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-zinc-300">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
            />
          </label>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-amber-400 text-zinc-950 font-semibold px-4 py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-40"
          >
            {busy ? "Enviando…" : "Enviarme el enlace"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
