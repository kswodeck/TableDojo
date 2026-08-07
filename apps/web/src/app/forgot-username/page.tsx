'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { Alert, Panel } from '@/components/ui/surface';

export default function ForgotUsernamePage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/auth/forgot-username', { email });
      setSent(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not send the reminder. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-center text-3xl font-bold">Forgot your username?</h1>
      <p className="mb-8 text-center text-ink-400">
        We will email it to the address on your account — we never show it on screen.
      </p>

      <Panel>
        {sent ? (
          <div className="space-y-4 text-center">
            <Alert tone="win">If that email is registered, your username is on its way.</Alert>
            <Link href="/login" className="inline-block text-sm font-medium text-brass-300 underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {error && <Alert tone="lose">{error}</Alert>}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              autoFocus
            />
            <Button type="submit" disabled={busy} size="lg" className="w-full">
              {busy ? 'Sending…' : 'Email me my username'}
            </Button>
            <p className="text-center text-sm text-ink-400">
              <Link href="/login" className="text-brass-300 underline-offset-4 hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </Panel>
    </div>
  );
}
