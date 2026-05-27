'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  isLocalDev,
  signInAsDev,
  signInWithGoogle,
} from '../../lib/firebase-client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/runs';

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devEmail, setDevEmail] = useState('dev@finanshels.com');

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      router.push(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  function handleDevSignIn() {
    setError(null);
    try {
      signInAsDev(devEmail);
      router.push(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    }
  }

  if (isLocalDev()) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold">Finanshels Neuro</h1>
            <p className="text-sm text-muted">
              Local dev mode. Pick any @finanshels.com email — no Firebase,
              no Google popup. Data resets on server restart.
            </p>
          </header>

          <label className="block space-y-1">
            <span className="text-xs uppercase text-muted">Email</span>
            <input
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              className="w-full rounded-md bg-muted/10 border border-muted/40 px-3 py-2 text-sm"
              placeholder="you@finanshels.com"
            />
          </label>

          <button
            onClick={handleDevSignIn}
            className="w-full rounded-md bg-accent text-white py-2 font-medium hover:opacity-90"
          >
            Continue (local dev)
          </button>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Finanshels Neuro</h1>
          <p className="text-sm text-muted">
            Internal staff sign-in. Restricted to @finanshels.com accounts.
          </p>
        </header>

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full rounded-md bg-accent text-white py-2 font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
