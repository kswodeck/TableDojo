'use client';

import { useCallback, useState } from 'react';
import { MAX_COMPETITIVE_BET, MIN_COMPETITIVE_BET, betTier } from '@tabledojo/game-logic';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { FarkleView } from '@/lib/types';
import { Button, ButtonLink } from '@/components/ui/button';
import { Alert, PageHeading, Panel } from '@/components/ui/surface';
import { BetControl } from '@/components/games/bet-control';
import { FarkleBoard } from '@/components/games/farkle-board';
import { RequireAuth } from '@/components/require-auth';
import { CoinCount } from '@/components/games/pieces';

const BET_OPTIONS = [10, 20, 30, 40, 50];

function Board() {
  const { user, setCoins } = useAuth();
  const [bet, setBet] = useState(MIN_COMPETITIVE_BET);
  const [turn, setTurn] = useState<FarkleView | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const coins = user?.coins ?? 0;

  const run = useCallback(
    async (work: () => Promise<FarkleView>) => {
      setBusy(true);
      setError(null);
      try {
        const view = await work();
        setTurn(view);
        setCoins(view.coins);
        setSelected([]);
        return view;
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [setCoins],
  );

  const start = () =>
    void (async () => {
      setResult(null);
      await run(() => api.post<FarkleView>('/api/games/farkle/start', { bet }));
    })();

  const onRoll = () =>
    void (async () => {
      const view = await run(() => api.post<FarkleView>('/api/games/farkle/roll', { sessionId: turn?.sessionId }));
      if (view?.status === 'farkled') setResult('Farkle — the turn ends and the points go with it.');
    })();

  const onKeep = () =>
    void run(() => api.post<FarkleView>('/api/games/farkle/keep', { sessionId: turn?.sessionId, indices: selected }));

  const onBank = () =>
    void (async () => {
      const view = await run(() => api.post<FarkleView>('/api/games/farkle/bank', { sessionId: turn?.sessionId }));
      if (view) setResult(`Banked ${(view.payout ?? 0).toLocaleString()} coins.`);
    })();

  const toggle = useCallback((index: number) => {
    setSelected((previous) =>
      previous.includes(index) ? previous.filter((value) => value !== index) : [...previous, index],
    );
  }, []);

  const finished = turn?.status === 'farkled' || turn?.status === 'banked';

  return (
    <div className="space-y-5">
      {error && <Alert tone="lose">{error}</Alert>}
      {result && <Alert tone={turn?.status === 'farkled' ? 'lose' : 'win'}>{result}</Alert>}

      {(!turn || finished) && (
        <Panel>
          <BetControl value={bet} onChange={setBet} options={BET_OPTIONS} coins={coins} disabled={busy} />
          <p className="mt-3 text-sm text-ink-400">
            Your bet sets the multiplier: at {bet} coins every point is worth {betTier(bet)}× the base score. Maximum{' '}
            {MAX_COMPETITIVE_BET}.
          </p>
          <Button onClick={start} disabled={busy || bet > coins} size="lg" className="mt-5">
            {turn ? 'New turn' : 'Start a turn'}
          </Button>
        </Panel>
      )}

      {turn && (
        <Panel>
          <FarkleBoard
            rolled={turn.rolled}
            selected={selected}
            onToggle={toggle}
            category={turn.category}
            pendingPoints={turn.pendingPoints}
            diceAvailable={turn.diceAvailable}
            keeps={turn.keeps}
            multiplier={betTier(turn.bet)}
            status={turn.status}
            disabled={busy}
          />

          {!finished && (
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {turn.status === 'awaiting-keep' && (
                <Button onClick={onKeep} disabled={busy || selected.length === 0} size="lg">
                  Keep {selected.length > 0 ? `${selected.length} ${selected.length === 1 ? 'die' : 'dice'}` : 'dice'}
                </Button>
              )}

              {turn.status === 'awaiting-roll' && (
                <>
                  <Button onClick={onRoll} disabled={busy} size="lg">
                    {turn.hotDice ? 'Hot dice — roll all six' : `Roll ${turn.diceAvailable}`}
                  </Button>
                  {turn.pendingPoints > 0 && (
                    <Button onClick={onBank} disabled={busy} variant="secondary" size="lg">
                      Bank {turn.pendingPoints.toLocaleString()}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {finished && (
            <p className="mt-6 text-center text-sm text-ink-400">
              Balance: <CoinCount coins={turn.coins} className="text-sm" />
            </p>
          )}
        </Panel>
      )}
    </div>
  );
}

export default function CompeteFarklePage() {
  return (
    <>
      <PageHeading
        eyebrow="Ranked"
        title="Farkle"
        description="Every roll and every keep is validated on the server, so a turn can only bank points it actually earned."
        actions={
          <>
            <ButtonLink href="/practice/farkle" variant="ghost" size="sm">
              Practice table
            </ButtonLink>
            <ButtonLink href="/leaderboard" variant="secondary" size="sm">
              Leaderboard
            </ButtonLink>
          </>
        }
      />
      <RequireAuth practiceHref="/practice/farkle">
        <Board />
      </RequireAuth>
    </>
  );
}
