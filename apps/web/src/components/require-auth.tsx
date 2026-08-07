'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ButtonLink } from '@/components/ui/button';
import { Panel } from '@/components/ui/surface';

/**
 * Gate for ranked pages.
 *
 * Rather than bouncing to the login screen the way the old `isLoggedIn`
 * middleware did, this explains what the page is and offers the free practice
 * table as an alternative — a signed-out visitor still has something to do.
 */
export function RequireAuth({ practiceHref, children }: { practiceHref?: string; children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="surface h-96 animate-pulse" aria-busy="true" aria-label="Loading" />
    );
  }

  if (!user) {
    return (
      <Panel className="text-center">
        <h2 className="text-2xl font-bold">Ranked play needs an account</h2>
        <p className="mx-auto mt-2 max-w-md text-ink-400">
          Coins, streaks and leaderboard places are tied to your account. Signing up is free and starts you with
          100 coins.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href={`/register?next=${encodeURIComponent(pathname)}`} size="lg">
            Create an account
          </ButtonLink>
          <ButtonLink href={`/login?next=${encodeURIComponent(pathname)}`} variant="secondary" size="lg">
            Sign in
          </ButtonLink>
        </div>
        {practiceHref && (
          <p className="mt-6 text-sm text-ink-400">
            Or{' '}
            <Link href={practiceHref} className="text-brass-300 underline underline-offset-4">
              practise for free
            </Link>{' '}
            — no account needed.
          </p>
        )}
      </Panel>
    );
  }

  return <>{children}</>;
}
