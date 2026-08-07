'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  act,
  availableActions,
  basicStrategy,
  canDouble,
  canSplit,
  handValue,
  startRound,
  type Action,
  type BlackjackState,
} from '@tabledojo/game-logic';
import { Button, ButtonLink } from '@/components/ui/button';
import { Alert, Badge, PageHeading, Panel } from '@/components/ui/surface';
import { BlackjackTable, type TableHand } from '@/components/games/blackjack-table';
import { cx } from '@/lib/format';

const PRACTICE_BET = 10;

interface Grade {
  correct: boolean;
  chosen: Action;
  ideal: Action;
  explanation: string;
}

/**
 * Free practice blackjack.
 *
 * The rules run in the browser against the same package the API uses, so there
 * is no round trip and no coin balance involved. That is what makes it safe to
 * show the correct play: nothing here can affect the leaderboard.
 */
export default function PracticeBlackjackPage() {
  const [round, setRound] = useState<BlackjackState | null>(null);
  const [coach, setCoach] = useState(true);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const deal = useCallback(() => {
    setGrade(null);
    setRound(startRound(PRACTICE_BET));
  }, []);

  const settled = round?.status === 'settled';
  const activeHand = round?.hands[round.activeHandIndex];

  // The advice for the decision currently facing the player.
  const advice = useMemo(() => {
    if (!round || settled || !activeHand || activeHand.status !== 'active') return null;
    const upcard = round.dealer[0];
    if (!upcard) return null;

    return basicStrategy(activeHand.cards, upcard, {
      canDouble: canDouble(round, round.activeHandIndex),
      canSplit: canSplit(round, round.activeHandIndex),
    });
  }, [round, settled, activeHand]);

  const onAction = useCallback(
    (action: Action) => {
      if (!round) return;

      // Grade the decision before applying it, while the context still holds.
      if (advice) {
        setGrade({
          correct: advice.action === action,
          chosen: action,
          ideal: advice.action,
          explanation: advice.explanation,
        });
        setScore((current) => ({
          correct: current.correct + (advice.action === action ? 1 : 0),
          total: current.total + 1,
        }));
      }

      setRound(act(round, action));
    },
    [round, advice],
  );

  const hands: TableHand[] = (round?.hands ?? []).map((hand) => ({
    cards: [...hand.cards],
    bet: hand.bet,
    status: hand.status,
    value: handValue(hand.cards),
    ...(hand.outcome ? { outcome: hand.outcome, payout: hand.payout } : {}),
  }));

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : null;

  return (
    <>
      <PageHeading
        eyebrow="Practice"
        title="Blackjack"
        description="No coins, no stakes, no limit. Six decks, dealer stands on soft 17, blackjack pays 3:2."
        actions={
          <>
            <ButtonLink href="/learn/blackjack" variant="ghost" size="sm">
              Basic strategy chart
            </ButtonLink>
            <ButtonLink href="/compete/blackjack" variant="secondary" size="sm">
              Play ranked
            </ButtonLink>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-200">
          <input
            type="checkbox"
            checked={coach}
            onChange={(event) => setCoach(event.target.checked)}
            className="h-4 w-4 accent-[var(--color-brass-500)]"
          />
          Show me the correct play
        </label>

        {accuracy !== null && (
          <Badge tone={accuracy >= 90 ? 'win' : accuracy >= 70 ? 'gold' : 'lose'}>
            {score.correct}/{score.total} correct · {accuracy}%
          </Badge>
        )}

        {score.total > 0 && (
          <button
            type="button"
            onClick={() => setScore({ correct: 0, total: 0 })}
            className="text-xs text-ink-400 underline-offset-4 hover:text-brass-300 hover:underline"
          >
            Reset score
          </button>
        )}
      </div>

      {!round ? (
        <Panel className="text-center">
          <h2 className="text-xl font-bold">Ready when you are</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">
            Every decision gets graded against basic strategy — the mathematically optimal play for these house
            rules. Turn the coach off to test yourself.
          </p>
          <Button onClick={deal} size="lg" className="mt-6">
            Deal a hand
          </Button>
        </Panel>
      ) : (
        <div className="space-y-5">
          <BlackjackTable
            hands={hands}
            activeHandIndex={round.activeHandIndex}
            dealer={[...round.dealer]}
            dealerValue={handValue(settled ? round.dealer : round.dealer.slice(0, 1))}
            dealerHoleCardHidden={!settled}
            actions={availableActions(round)}
            onAction={onAction}
            settled={Boolean(settled)}
          >
            {coach && advice && (
              <div className="mt-6 rounded-lg border border-brass-400/35 bg-brass-500/10 px-4 py-3 text-center">
                <p className="text-sm text-ink-200">
                  Basic strategy says{' '}
                  <strong className="font-bold tracking-wide text-brass-300 uppercase">{advice.action}</strong>
                </p>
                <p className="mt-1 text-xs text-ink-400">{advice.explanation}</p>
              </div>
            )}
          </BlackjackTable>

          {grade && (
            <Alert tone={grade.correct ? 'win' : 'lose'}>
              <p className="font-semibold">
                {grade.correct
                  ? `Correct — ${grade.chosen} was the right call.`
                  : `You chose ${grade.chosen}; basic strategy says ${grade.ideal}.`}
              </p>
              <p className={cx('mt-1 text-xs', grade.correct ? 'text-emerald-200/80' : 'text-crimson-400/90')}>
                {grade.explanation}
              </p>
            </Alert>
          )}

          {settled && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <p className="text-ink-200">
                Returned {round.totalPayout} of {hands.reduce((sum, hand) => sum + hand.bet, 0)} staked
              </p>
              <Button onClick={deal} size="lg">
                Deal again
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
