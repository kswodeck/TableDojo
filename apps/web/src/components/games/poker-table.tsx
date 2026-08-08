'use client';

import type { Card, HandRank } from '@tabledojo/game-logic';
import { MAX_BET, PAY_TABLE_ROWS, ROYAL_FLUSH_MAX_BET_PAYOUT } from '@tabledojo/game-logic';
import { cx } from '@/lib/format';
import { CardRow, PlayingCard } from './pieces';

export function PokerHand({
  hand,
  holds,
  onToggleHold,
  canHold,
}: {
  hand: (Card | null)[];
  holds: boolean[];
  onToggleHold: (index: number) => void;
  canHold: boolean;
}) {
  return (
    <CardRow>
      {hand.map((card, index) => (
        <PlayingCard
          key={card?.id ?? `slot-${index}`}
          card={card}
          held={holds[index]}
          dealDelayMs={index * 80}
          {...(canHold ? { onToggleHold: () => onToggleHold(index) } : {})}
        />
      ))}
    </CardRow>
  );
}

export function HandBanner({ rank, won }: { rank: HandRank | null; won?: number }) {
  if (!rank) return <div className="h-14" aria-hidden />;

  const losing = rank === 'No Win';
  return (
    <div
      className={cx(
        'animate-rise flex h-14 items-center justify-center gap-3 rounded-lg border text-lg font-bold',
        losing ? 'border-crimson-500/40 bg-crimson-600/15 text-crimson-400' : 'border-brass-400/45 bg-brass-500/15 text-brass-300',
      )}
      role="status"
    >
      {losing ? 'No win' : rank}
      {!losing && won !== undefined && won > 0 && <span className="tabular-nums">+{won}</span>}
    </div>
  );
}

/**
 * The pay table.
 *
 * The original hard-coded the multipliers in a payout function *and* separately
 * in a static HTML table, so the two could disagree. Both this and the settlement
 * maths now read the same exported constant.
 */
export function PayTable({ bet, highlight }: { bet: number; highlight?: HandRank | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Jacks or Better pay table</caption>
        <thead>
          <tr className="border-b border-felt-500/30 text-left text-xs tracking-[0.14em] text-ink-400 uppercase">
            <th scope="col" className="py-2 pr-4 font-semibold">
              Hand
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-semibold">
              Per coin
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              At {bet}
            </th>
          </tr>
        </thead>
        <tbody>
          {PAY_TABLE_ROWS.map((row) => {
            const jackpot = row.rank === 'Royal Flush' && bet >= MAX_BET;
            const payout = jackpot ? ROYAL_FLUSH_MAX_BET_PAYOUT : row.multiplier * bet;

            return (
              <tr
                key={row.rank}
                className={cx(
                  'border-b border-felt-500/15 last:border-0',
                  highlight === row.rank && 'bg-brass-500/15 font-bold text-brass-300',
                )}
              >
                <th scope="row" className="py-2 pr-4 text-left font-medium">
                  {row.rank}
                </th>
                <td className="py-2 pr-4 text-right tabular-nums text-ink-400">{row.multiplier}×</td>
                <td className={cx('py-2 text-right tabular-nums', jackpot && 'text-brass-300')}>{payout}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-ink-400">
        A royal flush pays a {ROYAL_FLUSH_MAX_BET_PAYOUT.toLocaleString()} jackpot at the maximum bet of {MAX_BET},
        which is why betting max is correct here.
      </p>
    </div>
  );
}
