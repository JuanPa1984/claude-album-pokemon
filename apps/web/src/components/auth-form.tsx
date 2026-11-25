'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === 'register';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');

    setSubmitting(true);
    setError(null);
    try {
      if (isRegister) await register(email, String(form.get('username') ?? ''), password);
      else await login(email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-poke-blue focus:ring-2 focus:ring-poke-blue/30';

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-1 text-2xl font-bold">
        {isRegister ? 'Become a trainer' : 'Welcome back'}
      </h1>
      <p className="mb-6 text-sm text-slate-600">
        {isRegister
          ? 'Create an account to start marking the stickers you own.'
          : 'Log in to keep filling your albums.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium">
          Email
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </label>
        {isRegister && (
          <label className="block text-sm font-medium">
            Username
            <input
              name="username"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              autoComplete="username"
              className={inputClass}
            />
          </label>
        )}
        <label className="block text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={isRegister ? 8 : undefined}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            className={inputClass}
          />
        </label>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-poke-red py-2.5 font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        {isRegister ? 'Already have an account? ' : 'New here? '}
        <Link href={isRegister ? '/login' : '/register'} className="font-semibold text-poke-blue">
          {isRegister ? 'Log in' : 'Sign up'}
        </Link>
      </p>
    </div>
  );
}
