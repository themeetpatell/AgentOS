'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithGoogle } from '../../lib/firebase-client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/runs';

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
