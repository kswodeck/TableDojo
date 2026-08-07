'use client';

import { useCallback, useState } from 'react';
import { addFlip, emptyCoinTally, flipCoin, type CoinSide } from '@tabledojo/game-logic';
import { Button } from '@/components/ui/button';
import { Badge, PageHeading, Panel } from '@/components/ui/surface';
import { Coin } from '@/components/games/pieces';

export default function CoinFlipPage() {
  const [side, setSide] = useState<CoinSide | null>(null);
  const [tally, setTally] = useState(emptyCoinTally());
  const [flips, setFlips] = useState(0);

  const onFlip = useCallback(() => {
    const result = flipCoin();
    setSide(result);
    setTally((previous) => addFlip(previous, result));
    setFlips((value) => value + 1);
  }, []);

  const total = tally.heads + tally.tails;
  const headsShare = total > 0 ? (tally.heads / total) * 100 : 0;

  return (
    <>
      <PageHeading eyebrow="Tools" title="Coin flip" description="Fifty-fifty, every time — however it felt last flip." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="flex flex-col items-center justify-center gap-6 py-12">
          <div className="flex h-40 items-center justify-center">
            {side ? (
              // The flip counter as key restarts the animation on every flip.
              <Coin key={flips} side={side} />
            ) : (
              <p className="text-ink-400">Flip to begin.</p>
            )}
          </div>

          {side && (
            <Badge tone="gold">
              <span className="text-base capitalize">{side}</span>
            </Badge>
          )}

          <Button onClick={onFlip} size="lg">
            Flip the coin
          </Button>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Running tally</h2>
            {total > 0 && (
              <button
                type="button"
                onClick={() => {
                  setTally(emptyCoinTally());
                  setSide(null);
                  setFlips(0);
                }}
                className="text-xs text-ink-400 underline-offset-4 hover:text-brass-300 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-felt-500/30 bg-felt-950/40 px-4 py-5 text-center">
              <dt className="text-xs tracking-[0.16em] text-ink-400 uppercase">Heads</dt>
              <dd className="mt-1 text-3xl font-bold tabular-nums text-brass-300">{tally.heads}</dd>
            </div>
            <div className="rounded-lg border border-felt-500/30 bg-felt-950/40 px-4 py-5 text-center">
              <dt className="text-xs tracking-[0.16em] text-ink-400 uppercase">Tails</dt>
              <dd className="mt-1 text-3xl font-bold tabular-nums text-brass-300">{tally.tails}</dd>
            </div>
          </dl>

          {total > 0 && (
            <>
              <div
                className="mt-5 flex h-3 overflow-hidden rounded-full bg-felt-950"
                role="img"
                aria-label={`Heads ${headsShare.toFixed(1)} percent, tails ${(100 - headsShare).toFixed(1)} percent`}
              >
                <div className="bg-brass-500 transition-all duration-300" style={{ width: `${headsShare}%` }} />
                <div className="flex-1 bg-felt-500" />
              </div>
              <p className="mt-3 text-center text-sm text-ink-400">
                {total.toLocaleString()} flips · heads {headsShare.toFixed(1)}%
              </p>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
