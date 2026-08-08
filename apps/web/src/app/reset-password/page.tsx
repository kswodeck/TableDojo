'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { Alert, Panel } from '@/components/ui/surface';

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const id = params.get('id') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setErrors({ confirm: 'The two passwords do not match' });
      return;
    }

    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      await api.post('/api/auth/reset-password', { id, token, password });
      router.push('/login?reset=1');
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.fieldErrors);
        setMessage(caught.message);
      } else {
        setMessage('Could not update your password. Please try again.');
      }
      setBusy(false);
    }
  }

  if (!token || !id) {
    return (
      <Panel className="text-center">
        <Alert tone="lose">That reset link is incomplete or malformed.</Alert>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm font-medium text-brass-300 underline-offset-4 hover:underline"
        >
          Request a new link
        </Link>
      </Panel>
    );
  }

  return (
    <Panel>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {message && <Alert tone="lose">{message}</Alert>}

        <TextField
          label="New password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          hint="At least 10 characters."
          autoComplete="new-password"
          required
          autoFocus
        />
        <TextField
          label="Confirm new password"
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={errors.confirm}
          autoComplete="new-password"
          required
        />

        <Button type="submit" disabled={busy} size="lg" className="w-full">
          {busy ? 'Updating…' : 'Set new password'}
        </Button>
      </form>
    </Panel>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-center text-3xl font-bold">Choose a new password</h1>
      <p className="mb-8 text-center text-ink-400">Then sign in with it.</p>
      <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-felt-800/40" />}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
