'use client';

import { useCallback, useState } from 'react';
import { MAX_BET, MIN_BET, type Card, type HandRank } from '@tabledojo/game-logic';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { PokerDealResponse, PokerDrawResponse } from '@/lib/types';
import { Button, ButtonLink } from '@/components/ui/button';
import { Alert, PageHeading, Panel } from '@/components/ui/surface';
import { BetControl } from '@/components/games/bet-control';
import { HandBanner, PayTable, PokerHand } from '@/components/games/poker-table';
import { RequireAuth } from '@/components/require-auth';

const BET_OPTIONS = Array.from({ length: MAX_BET - MIN_BET + 1 }, (_, index) => MIN_BET + index);
const NO_HOLDS = [false, false, false, false, false];
const EMPTY_HAND: (Card | null)[] = [null, null, null, null, null];

function Machine() {
  const { user, setCoins } = useAuth();
  const [bet, setBet] = useState(MAX_BET);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hand, setHand] = useState<(Card | null)[]>(EMPTY_HAND);
  const [holds, setHolds] = useState<boolean[]>(NO_HOLDS);
  const [phase, setPhase] = useState<'idle' | 'draw' | 'done'>('idle');
  const [rank, setRank] = useState<HandRank | null>(null);
  const [won, setWon] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coins = user?.coins ?? 0;

  const onDeal = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const round = await api.post<PokerDealResponse>('/api/games/poker/deal', { bet });
      setSessionId(round.sessionId);
      setHand(round.hand);
      setHolds(NO_HOLDS);
      setRank(null);
      setWon(0);
      setPhase('draw');
      setCoins(round.coins);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not deal. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [bet, setCoins]);

  const onDraw = useCallback(async () => {
    if (!sessionId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<PokerDrawResponse>('/api/games/poker/draw', { sessionId, holds });
      setHand(result.hand);
      setRank(result.result);
      setWon(result.payout);
      setPhase('done');
      setCoins(result.coins);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not complete the draw. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [sessionId, holds, setCoins]);

  const toggleHold = useCallback((index: number) => {
    setHolds((current) => current.map((held, position) => (position === index ? !held : held)));
  }, []);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-5">
        {error && <Alert tone="lose">{error}</Alert>}

        <Panel>
          <BetControl
            value={bet}
            onChange={setBet}
            options={BET_OPTIONS}
            coins={coins}
            disabled={busy || phase === 'draw'}
          />

          <div className="mt-6">
            <PokerHand hand={hand} holds={holds} onToggleHold={toggleHold} canHold={phase === 'draw' && !busy} />
          </div>

          <div className="mt-6">
            <HandBanner rank={rank} won={won} />
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {phase === 'draw' ? (
              <Button onClick={() => void onDraw()} disabled={busy} size="lg">
                Draw
              </Button>
            ) : (
              <Button onClick={() => void onDeal()} disabled={busy || bet > coins} size="lg">
                {phase === 'idle' ? 'Deal' : 'Deal again'}
              </Button>
            )}
          </div>

          {phase === 'draw' && (
            <p className="mt-4 text-center text-sm text-ink-400">Tap a card to hold it, then draw.</p>
          )}

          {bet > coins && phase !== 'draw' && (
            <p className="mt-4 text-center text-sm text-crimson-400">
              Not enough coins for that bet — lower it, or{' '}
              <a href="/practice/poker" className="underline underline-offset-4">
                practise for free
              </a>
              .
            </p>
          )}
        </Panel>
      </div>

      <Panel>
        <h2 className="mb-4 text-lg font-bold">Pay table</h2>
        <PayTable bet={bet} highlight={rank} />
      </Panel>
    </div>
  );
}

export default function CompetePokerPage() {
  return (
    <>
      <PageHeading
        eyebrow="Ranked"
        title="Video Poker"
        description="The server shuffles, holds the undealt deck and settles the hand, so the cards you draw are never decided in the browser."
        actions={
          <>
            <ButtonLink href="/practice/poker" variant="ghost" size="sm">
              Practice table
            </ButtonLink>
            <ButtonLink href="/leaderboard" variant="secondary" size="sm">
              Leaderboard
            </ButtonLink>
          </>
        }
      />
      <RequireAuth practiceHref="/practice/poker">
        <Machine />
      </RequireAuth>
    </>
  );
}
