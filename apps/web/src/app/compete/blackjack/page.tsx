'use client';

import { useCallback, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { BlackjackView } from '@/lib/types';
import { Button, ButtonLink } from '@/components/ui/button';
import { Alert, PageHeading, Panel } from '@/components/ui/surface';
import { BetControl } from '@/components/games/bet-control';
import { BlackjackTable, type BlackjackAction } from '@/components/games/blackjack-table';
import { RequireAuth } from '@/components/require-auth';
import { CoinCount } from '@/components/games/pieces';

const BET_OPTIONS = [5, 10, 25, 50, 100];

function Table() {
  const { user, setCoins } = useAuth();
  const [bet, setBet] = useState(10);
  const [round, setRound] = useState<BlackjackView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coins = user?.coins ?? 0;

  const apply = useCallback(
    (view: BlackjackView) => {
      setRound(view);
      setCoins(view.coins);
    },
    [setCoins],
  );

  const run = useCallback(async (work: () => Promise<BlackjackView>) => {
    setBusy(true);
    setError(null);
    try {
      apply(await work());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [apply]);

  const start = () => void run(() => api.post<BlackjackView>('/api/games/blackjack/start', { bet }));

  const play = (action: BlackjackAction) =>
    void run(() => api.post<BlackjackView>('/api/games/blackjack/action', { sessionId: round?.sessionId, action }));

  const settled = round?.status === 'settled';
  const staked = round?.hands.reduce((sum, hand) => sum + hand.bet, 0) ?? 0;
  const net = (round?.totalPayout ?? 0) - staked;

  return (
    <div className="space-y-5">
      {error && <Alert tone="lose">{error}</Alert>}

      {(!round || settled) && (
        <Panel>
          <BetControl value={bet} onChange={setBet} options={BET_OPTIONS} coins={coins} disabled={busy} />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={start} disabled={busy || bet > coins} size="lg">
              {round ? 'Deal again' : 'Deal'}
            </Button>
            {bet > coins && (
              <p className="text-sm text-crimson-400">
                Not enough coins for that bet.{' '}
                <a href="/practice/blackjack" className="underline underline-offset-4">
                  Practice for free
                </a>{' '}
                or come back tomorrow for your streak bonus.
              </p>
            )}
          </div>
        </Panel>
      )}

      {round && (
        <>
          <BlackjackTable
            hands={round.hands}
            activeHandIndex={round.activeHandIndex}
            dealer={round.dealer}
            dealerValue={round.dealerValue}
            dealerHoleCardHidden={round.dealerHoleCardHidden}
            actions={round.availableActions}
            onAction={play}
            busy={busy}
            settled={Boolean(settled)}
          />

          {settled && (
            <Panel className="text-center">
              <p className="text-lg font-semibold">
                {net > 0 ? (
                  <span className="text-emerald-300">
                    Up {net} — returned <CoinCount coins={round.totalPayout} />
                  </span>
                ) : net === 0 ? (
                  <span className="text-ink-200">Push — your {staked} came back</span>
                ) : (
                  <span className="text-crimson-400">Down {Math.abs(net)}</span>
                )}
              </p>
              <p className="mt-1 text-sm text-ink-400">
                Balance: <CoinCount coins={round.coins} className="text-sm" />
              </p>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

export default function CompeteBlackjackPage() {
  return (
    <>
      <PageHeading
        eyebrow="Ranked"
        title="Blackjack"
        description="Coins on the line. The server deals, scores and pays every hand — nothing about the round is decided in your browser."
        actions={
          <>
            <ButtonLink href="/practice/blackjack" variant="ghost" size="sm">
              Practice table
            </ButtonLink>
            <ButtonLink href="/leaderboard" variant="secondary" size="sm">
              Leaderboard
            </ButtonLink>
          </>
        }
      />
      <RequireAuth practiceHref="/practice/blackjack">
        <Table />
      </RequireAuth>
    </>
  );
}
