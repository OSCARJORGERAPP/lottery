export default function Footer() {
  return (
    <footer className="border-t border-zinc-800/80 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-zinc-500 flex flex-wrap items-center justify-between gap-2">
        <p>Lottery — proyecto académico. Pagos en modo test con Stripe.</p>
        <p className="font-[family-name:var(--font-geist-mono)]">
          premio único · transferencia al ganador
        </p>
      </div>
    </footer>
  );
}
