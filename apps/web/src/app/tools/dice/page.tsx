'use client';

import { useCallback, useState } from 'react';
import { MAX_DICE, MIN_DICE, emptyDiceTally, mergeTally, rollTray, tallyRoll, tallyTotal, type DieValue } from '@tabledojo/game-logic';
import { Button } from '@/components/ui/button';
import { PageHeading, Panel } from '@/components/ui/surface';
import { Die } from '@/components/games/pieces';

const FACES: DieValue[] = [1, 2, 3, 4, 5, 6];

export default function DiceRollerPage() {
  const [count, setCount] = useState(6);
  const [rolled, setRolled] = useState<DieValue[]>([]);
  const [session, setSession] = useState(emptyDiceTally());
  const [rolls, setRolls] = useState(0);

  const onRoll = useCallback(() => {
    const values = rollTray(count);
    setRolled(values);
    setSession((previous) => mergeTally(previous, tallyRoll(values)));
    setRolls((value) => value + 1);
  }, [count]);

  const current = tallyRoll(rolled);
  const sessionTotal = tallyTotal(session);

  return (
    <>
      <PageHeading
        eyebrow="Tools"
        title="Dice roller"
        description="Roll up to 20 dice and watch the distribution even out. Useful for settling arguments about how random random really is."
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex-1">
              <span className="mb-2 block text-sm font-medium text-ink-200">
                How many dice: <strong className="text-brass-300 tabular-nums">{count}</strong>
              </span>
              <input
                type="range"
                min={MIN_DICE}
                max={MAX_DICE}
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="w-full accent-[var(--color-brass-500)]"
              />
            </label>
            <Button onClick={onRoll} size="lg">
              Roll
            </Button>
          </div>

          <div className="mt-8 flex min-h-32 flex-wrap items-center justify-center gap-2">
            {rolled.length === 0 ? (
              <p className="text-ink-400">Pick a number of dice and roll.</p>
            ) : (
              rolled.map((value, index) => <Die key={`${index}-${value}-${rolls}`} value={value} size="sm" />)
            )}
          </div>

          {rolled.length > 0 && (
            <p className="mt-4 text-center text-sm text-ink-400">
              This roll totals <strong className="text-ink-50 tabular-nums">{rolled.reduce((a, b) => a + b, 0)}</strong>
            </p>
          )}
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Distribution</h2>
            {sessionTotal > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSession(emptyDiceTally());
                  setRolled([]);
                }}
                className="text-xs text-ink-400 underline-offset-4 hover:text-brass-300 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-felt-500/30 text-xs tracking-[0.14em] text-ink-400 uppercase">
                <th scope="col" className="py-2 text-left font-semibold">
                  Face
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  This roll
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  All rolls
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {FACES.map((face) => {
                const share = sessionTotal > 0 ? (session[face] / sessionTotal) * 100 : 0;
                return (
                  <tr key={face} className="border-b border-felt-500/15 last:border-0">
                    <th scope="row" className="py-2 text-left">
                      <Die value={face} size="sm" />
                    </th>
                    <td className="py-2 text-right tabular-nums text-ink-400">{current[face]}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{session[face]}</td>
                    <td className="py-2 text-right tabular-nums text-brass-300">
                      {sessionTotal > 0 ? `${share.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="mt-4 text-xs text-ink-400">
            {sessionTotal.toLocaleString()} dice rolled across {rolls} {rolls === 1 ? 'roll' : 'rolls'}. Each face
            should converge on 16.7%.
          </p>
        </Panel>
      </div>
    </>
  );
}
