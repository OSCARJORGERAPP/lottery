import Link from "next/link";
import { getSession } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function Navbar() {
  const session = await getSession();
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 sticky top-0 z-10 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 group">
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-zinc-950 text-[11px] font-bold font-[family-name:var(--font-geist-mono)] group-hover:bg-amber-300 transition-colors"
          >
            7
          </span>
          <span className="font-semibold tracking-wide">Lottery</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-zinc-400 ml-auto">
          <Link href="/" className="hover:text-zinc-100 transition-colors">
            Sorteos
          </Link>
          {session && !session.isAdmin && (
            <Link href="/profile" className="hover:text-zinc-100 transition-colors">
              Mis boletos
            </Link>
          )}
          {session?.isAdmin && (
            <Link href="/admin" className="hover:text-amber-300 text-amber-400 transition-colors">
              Admin
            </Link>
          )}
          {session ? (
            <LogoutButton />
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-zinc-100 text-zinc-950 px-3 py-1.5 font-medium hover:bg-white transition-colors"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
