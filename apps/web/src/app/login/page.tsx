'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { Alert, Panel } from '@/components/ui/surface';

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      router.push(next);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not sign you in. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-center text-3xl font-bold">Welcome back</h1>
      <p className="mb-8 text-center text-ink-400">Sign in to collect your streak bonus and keep your place.</p>

      <Panel>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && <Alert tone="lose">{error}</Alert>}

          <TextField
            label="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <Button type="submit" disabled={busy} size="lg" className="w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-6 space-y-2 border-t border-felt-500/25 pt-5 text-center text-sm">
          <p className="text-ink-400">
            <Link href="/forgot-password" className="text-brass-300 underline-offset-4 hover:underline">
              Forgot your password?
            </Link>
            {' · '}
            <Link href="/forgot-username" className="text-brass-300 underline-offset-4 hover:underline">
              Forgot your username?
            </Link>
          </p>
          <p className="text-ink-400">
            No account?{' '}
            <Link href="/register" className="font-medium text-brass-300 underline-offset-4 hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </Panel>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-md animate-pulse rounded-xl bg-felt-800/40" />}>
      <LoginForm />
    </Suspense>
  );
}
