'use client';

import { useAuth } from '@/lib/auth-context';

/**
 * Tells the visitor the API is waking up.
 *
 * The API runs on a free tier that suspends after 15 minutes idle and takes
 * the better part of a minute to come back. Without this, the first visitor
 * after a quiet spell sees a header with no sign-in button and a ranked table
 * that never loads, with nothing explaining why.
 *
 * Everything that matters for a first impression — the home page, the guides
 * and all three practice tables — runs entirely in the browser and works while
 * this is on screen.
 */
export function WakeNotice() {
  const { wakingUp } = useAuth();

  if (!wakingUp) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-rise border-b border-brass-400/30 bg-brass-500/10 px-4 py-2 text-center text-sm text-brass-300"
    >
      <span
        aria-hidden
        className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-brass-400 align-middle"
      />
      Waking the game server — this takes up to a minute on the free tier. Practice tables and guides work
      right now.
    </div>
  );
}
