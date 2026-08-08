'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AVATARS, type Avatar, type User } from '@/lib/types';
import { cx, formatDate, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { Alert, PageHeading, Panel } from '@/components/ui/surface';
import { Modal } from '@/components/ui/modal';
import { RequireAuth } from '@/components/require-auth';

function ProfileForm({ user }: { user: User }) {
  const { refresh, logout } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    birthday: user.birthday ?? '',
  });
  const [avatar, setAvatar] = useState<Avatar>(user.profileImage);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ tone: 'win' | 'lose'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordBanner, setPasswordBanner] = useState<{ tone: 'win' | 'lose'; text: string } | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setBanner(null);
    try {
      await api.put('/api/account', { ...form, birthday: form.birthday || null, profileImage: avatar });
      await refresh();
      setBanner({ tone: 'win', text: 'Your account has been updated.' });
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.fieldErrors);
        setBanner({ tone: 'lose', text: caught.message });
      } else {
        setBanner({ tone: 'lose', text: 'Could not save your changes.' });
      }
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordErrors({});
    setPasswordBanner(null);
    try {
      await api.put('/api/account/password', passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      setPasswordBanner({ tone: 'win', text: 'Your password has been updated.' });
    } catch (caught) {
      if (caught instanceof ApiError) {
        setPasswordErrors(caught.fieldErrors);
        setPasswordBanner({ tone: 'lose', text: caught.message });
      } else {
        setPasswordBanner({ tone: 'lose', text: 'Could not update your password.' });
      }
    }
  }

  async function deleteAccount() {
    setDeleteError(null);
    try {
      await api.delete('/api/account', { password: deletePassword });
      await logout().catch(() => undefined);
      router.push('/');
    } catch (caught) {
      setDeleteError(caught instanceof ApiError ? caught.message : 'Could not delete your account.');
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-5">
        <Panel>
          <h2 className="mb-5 text-lg font-bold">Profile</h2>
          <form onSubmit={saveProfile} className="space-y-4" noValidate>
            {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

            <TextField label="Username" value={form.username} onChange={set('username')} error={errors.username} autoComplete="username" required />
            <TextField label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" required />

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="First name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} autoComplete="given-name" />
              <TextField label="Last name" value={form.lastName} onChange={set('lastName')} error={errors.lastName} autoComplete="family-name" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Date of birth"
                type="date"
                value={form.birthday}
                onChange={set('birthday')}
                error={errors.birthday}
                max={new Date().toISOString().slice(0, 10)}
                autoComplete="bday"
              />
              <TextField label="Phone" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} hint="Optional." autoComplete="tel" />
            </div>

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
                    <input type="radio" name="avatar" checked={avatar === option} onChange={() => setAvatar(option)} className="sr-only" />
                    <Image src={`/images/${option}.webp`} alt={option.replace('-', ' ')} width={44} height={44} className="h-11 w-11 rounded-full" />
                  </label>
                ))}
              </div>
            </fieldset>

            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </Panel>

        <Panel>
          <h2 className="mb-5 text-lg font-bold">Password</h2>
          <form onSubmit={savePassword} className="space-y-4" noValidate>
            {passwordBanner && <Alert tone={passwordBanner.tone}>{passwordBanner.text}</Alert>}
            <TextField
              label="Current password"
              type="password"
              value={passwords.currentPassword}
              onChange={(event) => setPasswords((p) => ({ ...p, currentPassword: event.target.value }))}
              error={passwordErrors.currentPassword}
              autoComplete="current-password"
              required
            />
            <TextField
              label="New password"
              type="password"
              value={passwords.newPassword}
              onChange={(event) => setPasswords((p) => ({ ...p, newPassword: event.target.value }))}
              error={passwordErrors.newPassword}
              hint="At least 10 characters."
              autoComplete="new-password"
              required
            />
            <Button type="submit" variant="secondary">
              Update password
            </Button>
          </form>
        </Panel>

        <Panel className="border-crimson-500/30">
          <h2 className="mb-2 text-lg font-bold text-crimson-400">Delete account</h2>
          <p className="mb-4 text-sm text-ink-400">
            This removes your account, coins and leaderboard place for good. Your posts stay up but are
            reattributed to <span className="font-mono">[deleted]</span>.
          </p>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Delete my account
          </Button>
        </Panel>
      </div>

      <aside className="space-y-5">
        <Panel className="text-center">
          <Image
            src={`/images/${user.profileImage}.webp`}
            alt=""
            width={80}
            height={80}
            className="mx-auto h-20 w-20 rounded-full ring-2 ring-brass-400/50"
            aria-hidden
          />
          <p className="mt-3 text-lg font-bold">{user.username}</p>
          <p className="text-xs text-ink-400">Member since {formatDate(user.createdAt)}</p>

          <dl className="mt-5 space-y-3 text-left">
            {[
              ['Coins', formatNumber(user.coins)],
              ['Best win', formatNumber(user.highestWin)],
              ['Login streak', `${user.loginStreak} ${user.loginStreak === 1 ? 'day' : 'days'}`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-felt-500/20 pb-2 last:border-0">
                <dt className="text-sm text-ink-400">{label}</dt>
                <dd className="font-bold tabular-nums text-brass-300">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </aside>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete your account?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={() => void deleteAccount()}>
              Delete permanently
            </Button>
          </>
        }
      >
        <p>This cannot be undone. Enter your password to confirm.</p>
        {deleteError && <Alert tone="lose">{deleteError}</Alert>}
        <TextField
          label="Password"
          type="password"
          value={deletePassword}
          onChange={(event) => setDeletePassword(event.target.value)}
          autoComplete="current-password"
        />
      </Modal>
    </div>
  );
}

export default function AccountPage() {
  const { user, refresh } = useAuth();

  // Re-read the profile on mount so the coin balance reflects any games just
  // played. `refresh` is a stable useCallback, so this runs once.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <>
      <PageHeading eyebrow="Account" title="My account" description="Your profile, password and stats." />
      <RequireAuth>{user && <ProfileForm key={user.id} user={user} />}</RequireAuth>
    </>
  );
}
