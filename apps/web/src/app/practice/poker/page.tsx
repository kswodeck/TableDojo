'use client';

import { useCallback, useState } from 'react';
import { deal, draw, evaluateHand, type Card, type HandRank } from '@tabledojo/game-logic';
import { Button, ButtonLink } from '@/components/ui/button';
import { PageHeading, Panel } from '@/components/ui/surface';
import { HandBanner, PayTable, PokerHand } from '@/components/games/poker-table';

const NO_HOLDS = [false, false, false, false, false];

/**
 * Free practice video poker: rules run in the browser, nothing is wagered.
 */
export default function PracticePokerPage() {
  const [hand, setHand] = useState<(Card | null)[]>([null, null, null, null, null]);
  const [stock, setStock] = useState<Card[]>([]);
  const [holds, setHolds] = useState<boolean[]>(NO_HOLDS);
  const [phase, setPhase] = useState<'idle' | 'draw' | 'done'>('idle');
  const [rank, setRank] = useState<HandRank | null>(null);

  const onDeal = useCallback(() => {
    const round = deal();
    setHand(round.hand);
    setStock(round.stock);
    setHolds(NO_HOLDS);
    setRank(null);
    setPhase('draw');
  }, []);

  const onDraw = useCallback(() => {
    const final = draw(hand as Card[], stock, holds);
    setHand(final);
    setRank(evaluateHand(final));
    setPhase('done');
  }, [hand, stock, holds]);

  const toggleHold = useCallback((index: number) => {
    setHolds((current) => current.map((held, position) => (position === index ? !held : held)));
  }, []);

  return (
    <>
      <PageHeading
        eyebrow="Practice"
        title="Video Poker"
        description="Jacks or Better on a 9/6 pay table. Hold what helps, draw the rest — no coins involved."
        actions={
          <>
            <ButtonLink href="/learn/poker" variant="ghost" size="sm">
              Hand ranks
            </ButtonLink>
            <ButtonLink href="/compete/poker" variant="secondary" size="sm">
              Play ranked
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel>
          <PokerHand hand={hand} holds={holds} onToggleHold={toggleHold} canHold={phase === 'draw'} />

          <div className="mt-6">
            <HandBanner rank={rank} />
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {phase === 'draw' ? (
              <Button onClick={onDraw} size="lg">
                Draw
              </Button>
            ) : (
              <Button onClick={onDeal} size="lg">
                {phase === 'idle' ? 'Deal' : 'Deal again'}
              </Button>
            )}
          </div>

          {phase === 'draw' && (
            <p className="mt-4 text-center text-sm text-ink-400">
              Tap a card to hold it. Anything you do not hold gets replaced.
            </p>
          )}
        </Panel>

        <Panel>
          <h2 className="mb-4 text-lg font-bold">Pay table</h2>
          <PayTable bet={1} highlight={rank} />
        </Panel>
      </div>
    </>
  );
}
