'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="border-b-4 border-poke-yellow bg-poke-red text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <span
            aria-hidden
            className="inline-block h-6 w-6 rounded-full border-4 border-slate-900 bg-[linear-gradient(to_bottom,#e3350d_45%,#1e293b_45%,#1e293b_55%,#fff_55%)]"
          />
          Album Pokémon
        </Link>

        <nav className="flex items-center gap-3 text-sm font-medium">
          {loading ? null : user ? (
            <>
              <span className="hidden sm:inline">
                Trainer <strong>{user.username}</strong>
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-md bg-white/15 px-3 py-1.5 hover:bg-white/25"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-md px-3 py-1.5 hover:bg-white/15">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-poke-yellow px-3 py-1.5 text-slate-900 hover:brightness-95"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
