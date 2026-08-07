'use client';

import type { Card } from '@tabledojo/game-logic';
import { cx } from '@/lib/format';
import { Badge } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { PlayingCard } from './pieces';

export type BlackjackAction = 'hit' | 'stand' | 'double' | 'split';

export interface TableHand {
  cards: Card[];
  bet: number;
  status: 'active' | 'stood' | 'busted' | 'blackjack';
  value: { total: number; soft: boolean; busted: boolean };
  outcome?: 'blackjack' | 'win' | 'push' | 'lose';
  payout?: number;
}

const OUTCOME_LABEL: Record<NonNullable<TableHand['outcome']>, { text: string; tone: 'win' | 'lose' | 'neutral' | 'gold' }> = {
  blackjack: { text: 'Blackjack — pays 3:2', tone: 'gold' },
  win: { text: 'Win', tone: 'win' },
  push: { text: 'Push', tone: 'neutral' },
  lose: { text: 'Lose', tone: 'lose' },
};

const ACTION_LABEL: Record<BlackjackAction, string> = {
  hit: 'Hit',
  stand: 'Stand',
  double: 'Double',
  split: 'Split',
};

function total(value: TableHand['value']): string {
  return value.soft && value.total <= 21 ? `${value.total - 10}/${value.total}` : String(value.total);
}

/**
 * The blackjack felt.
 *
 * Purely presentational, so the free practice table (rules running in the
 * browser) and the ranked table (rules running on the server) render from the
 * same component and cannot drift apart visually.
 */
export function BlackjackTable({
  hands,
  activeHandIndex,
  dealer,
  dealerValue,
  dealerHoleCardHidden,
  actions,
  onAction,
  busy,
  settled,
  children,
}: {
  hands: TableHand[];
  activeHandIndex: number;
  dealer: Card[];
  dealerValue: { total: number; soft: boolean; busted: boolean };
  dealerHoleCardHidden: boolean;
  actions: BlackjackAction[];
  onAction: (action: BlackjackAction) => void;
  busy?: boolean;
  settled: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="surface p-5 sm:p-8">
      <section aria-label="Dealer hand" className="text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <h2 className="text-sm font-semibold tracking-[0.16em] text-ink-400 uppercase">Dealer</h2>
          <Badge tone={dealerValue.busted ? 'lose' : 'neutral'}>
            {dealerHoleCardHidden ? `${dealerValue.total} + ?` : total(dealerValue)}
            {dealerValue.busted && ' — bust'}
          </Badge>
        </div>

        <div className="flex justify-center gap-2">
          {dealer.map((card, index) => (
            <div key={card.id + index} className="w-16 sm:w-20">
              <PlayingCard card={card} dealDelayMs={index * 90} />
            </div>
          ))}
          {dealerHoleCardHidden && (
            <div className="w-16 sm:w-20">
              <PlayingCard card={null} />
            </div>
          )}
        </div>
      </section>

      <hr className="my-8 border-felt-500/25" />

      <section aria-label="Your hands" className={cx('grid gap-6', hands.length > 1 ? 'sm:grid-cols-2' : '')}>
        {hands.map((hand, index) => {
          const isActive = !settled && index === activeHandIndex && hand.status === 'active';
          const outcome = hand.outcome ? OUTCOME_LABEL[hand.outcome] : null;

          return (
            <div
              key={index}
              className={cx(
                'rounded-xl p-3 transition-all',
                isActive && hands.length > 1 && 'bg-felt-700/40 ring-1 ring-brass-400/50',
              )}
            >
              <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
                {hands.length > 1 && (
                  <span className="text-xs font-semibold tracking-wider text-ink-400 uppercase">Hand {index + 1}</span>
                )}
                <Badge tone={hand.value.busted ? 'lose' : hand.status === 'blackjack' ? 'gold' : 'neutral'}>
                  {total(hand.value)}
                  {hand.value.busted && ' — bust'}
                </Badge>
                <Badge tone="gold">{hand.bet} wagered</Badge>
                {outcome && <Badge tone={outcome.tone}>{outcome.text}</Badge>}
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {hand.cards.map((card, cardIndex) => (
                  <div key={card.id + cardIndex} className="w-16 sm:w-20">
                    <PlayingCard card={card} dealDelayMs={cardIndex * 90} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {children}

      {actions.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {(['hit', 'stand', 'double', 'split'] as BlackjackAction[])
            .filter((action) => actions.includes(action))
            .map((action) => (
              <Button
                key={action}
                onClick={() => onAction(action)}
                disabled={busy}
                variant={action === 'stand' ? 'secondary' : 'primary'}
                size="lg"
              >
                {ACTION_LABEL[action]}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
