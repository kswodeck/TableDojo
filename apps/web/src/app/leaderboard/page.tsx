'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { LeaderboardPage } from '@/lib/types';
import { cx, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Alert, EmptyState, PageHeading, Panel } from '@/components/ui/surface';

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardPageView() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LeaderboardPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPage: number, term: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(nextPage) });
      if (term) params.set('search', term);
      setData(await api.get<LeaderboardPage>(`/api/leaderboard?${params.toString()}`));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load the leaderboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search, so typing does not fire a request per keystroke the way
  // the old `incremental` search input did.
  useEffect(() => {
    const timer = setTimeout(() => void load(page, search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [page, search, load]);

  return (
    <>
      <PageHeading
        eyebrow="Compete"
        title="Leaderboard"
        description="Ranked by coins. Win them at the ranked tables, or collect the daily streak bonus."
      />

      <Panel className="p-0">
        <div className="border-b border-felt-500/25 p-4">
          <label className="relative block">
            <span className="sr-only">Search by username</span>
            <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
              ⌕
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by username…"
              maxLength={25}
              className="w-full rounded-lg border border-felt-500/40 bg-felt-950/60 py-2.5 pl-9 pr-3 text-ink-50 placeholder:text-ink-600 focus:border-brass-400 focus:outline-none"
            />
          </label>
        </div>

        {error && (
          <div className="p-4">
            <Alert tone="lose">{error}</Alert>
          </div>
        )}

        {loading && !data ? (
          <div className="space-y-2 p-4" aria-busy="true">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-lg bg-felt-700/40" />
            ))}
          </div>
        ) : data && data.entries.length === 0 ? (
          <EmptyState
            title="Nobody found"
            description={search ? `No player matches “${search}”.` : 'The board is empty — be the first on it.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem]">
              <caption className="sr-only">Players ranked by coin balance</caption>
              <thead>
                <tr className="border-b border-felt-500/25 text-xs tracking-[0.14em] text-ink-400 uppercase">
                  <th scope="col" className="px-4 py-3 text-left font-semibold">
                    Rank
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold">
                    Player
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Best win
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Coins
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.entries.map((entry) => {
                  const isMe = user?.username === entry.username;
                  return (
                    <tr
                      key={entry.username}
                      className={cx(
                        'border-b border-felt-500/12 transition-colors last:border-0 hover:bg-felt-800/40',
                        isMe && 'bg-brass-500/10',
                      )}
                    >
                      <td className="px-4 py-3 font-bold tabular-nums">
                        <span className={cx(entry.rank <= 3 ? 'text-brass-300' : 'text-ink-400')}>
                          {MEDALS[entry.rank] ?? entry.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2.5">
                          <Image
                            src={`/images/${entry.profileImage}.webp`}
                            alt=""
                            width={28}
                            height={28}
                            className="h-7 w-7 rounded-full ring-1 ring-felt-500/40"
                            aria-hidden
                          />
                          <span className={cx('font-medium', isMe ? 'text-brass-300' : 'text-ink-50')}>
                            {entry.username}
                            {isMe && <span className="ml-2 text-xs text-ink-400">you</span>}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink-400">{formatNumber(entry.highestWin)}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-brass-300">
                        {formatNumber(entry.coins)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <nav aria-label="Leaderboard pages" className="flex items-center justify-between gap-3 border-t border-felt-500/25 p-4">
            <Button variant="secondary" size="sm" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>
              ← Previous
            </Button>
            <p className="text-sm text-ink-400">
              Page {data.page} of {data.totalPages} · {formatNumber(data.total)} players
            </p>
            <Button
              variant="secondary"
              size="sm"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage(data.page + 1)}
            >
              Next →
            </Button>
          </nav>
        )}
      </Panel>
    </>
  );
}
