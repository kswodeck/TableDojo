'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AVATARS, type Avatar } from '@/lib/types';
import { cx } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { Alert, Panel } from '@/components/ui/surface';

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    birthday: '',
  });
  const [avatar, setAvatar] = useState<Avatar>('smiley');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      await register({
        ...form,
        birthday: form.birthday || undefined,
        profileImage: avatar,
      });
      router.push(next);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.fieldErrors);
        setMessage(caught.message);
      } else {
        setMessage('Could not create your account. Please try again.');
      }
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 text-center text-3xl font-bold">Create your account</h1>
      <p className="mb-8 text-center text-ink-400">Free, and you start with 100 coins.</p>

      <Panel>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {message && <Alert tone="lose">{message}</Alert>}

          <TextField
            label="Username"
            value={form.username}
            onChange={set('username')}
            error={errors.username}
            hint="5–25 characters. This is what appears on the leaderboard."
            autoComplete="username"
            required
            autoFocus
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={set('email')}
            error={errors.email}
            hint="Used only for account recovery."
            autoComplete="email"
            required
          />
          <TextField
            label="Password"
            type="password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            hint="At least 10 characters. Longer beats complicated."
            autoComplete="new-password"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="First name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} autoComplete="given-name" />
            <TextField label="Last name" value={form.lastName} onChange={set('lastName')} error={errors.lastName} autoComplete="family-name" />
          </div>

          <TextField
            label="Date of birth"
            type="date"
            value={form.birthday}
            onChange={set('birthday')}
            error={errors.birthday}
            hint="Optional."
            max={new Date().toISOString().slice(0, 10)}
            autoComplete="bday"
          />

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink-200">Avatar</legend>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((option) => (
                <label
                  key={option}
                  className={cx(
                    'cursor-pointer rounded-full p-1 transition-all',
                    avatar === option ? 'ring-2 ring-brass-400' : 'ring-1 ring-felt-500/40 hover:ring-brass-300/60',
                  )}
                >
                  <input
                    type="radio"
                    name="avatar"
                    value={option}
                    checked={avatar === option}
                    onChange={() => setAvatar(option)}
                    className="sr-only"
                  />
                  <Image src={`/images/${option}.webp`} alt={option.replace('-', ' ')} width={44} height={44} className="h-11 w-11 rounded-full" />
                </label>
              ))}
            </div>
          </fieldset>

          <Button type="submit" disabled={busy} size="lg" className="w-full">
            {busy ? 'Creating account…' : 'Create account'}
          </Button>

          <p className="text-center text-xs text-ink-400">
            Table Dojo is play money only. There are no real stakes, no deposits and no cash prizes.
          </p>
        </form>

        <p className="mt-6 border-t border-felt-500/25 pt-5 text-center text-sm text-ink-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brass-300 underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </Panel>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-[40rem] max-w-lg animate-pulse rounded-xl bg-felt-800/40" />}>
      <RegisterForm />
    </Suspense>
  );
}
