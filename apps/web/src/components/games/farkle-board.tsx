'use client';

import type { DieValue, RollCategory } from '@tabledojo/game-logic';
import { scoreDice, scoreSelection, toPoints } from '@tabledojo/game-logic';
import { Badge } from '@/components/ui/surface';
import { Die } from './pieces';

export interface FarkleBoardProps {
  rolled: DieValue[];
  selected: number[];
  onToggle: (index: number) => void;
  category: RollCategory | null;
  pendingPoints: number;
  diceAvailable: number;
  keeps: { dice: DieValue[]; points: number }[];
  multiplier: number;
  status: 'awaiting-roll' | 'awaiting-keep' | 'farkled' | 'banked';
  disabled?: boolean;
}

/**
 * The Farkle table.
 *
 * The dice that can legally be kept are worked out from the rules package, so
 * dead dice are visibly dimmed and cannot be selected — the original let you
 * click any die and only complained afterwards.
 */
export function FarkleBoard({
  rolled,
  selected,
  onToggle,
  category,
  pendingPoints,
  diceAvailable,
  keeps,
  multiplier,
  status,
  disabled,
}: FarkleBoardProps) {
  const scoringIndices = new Set(scoreDice(rolled).scoringIndices);
  const selectionScore = scoreSelection(rolled, selected);
  const selectionPoints = selectionScore ? toPoints(selectionScore.units, multiplier) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {category && (
          <Badge tone={category === 'Farkle' ? 'lose' : 'gold'}>{status === 'farkled' ? 'Farkle!' : category}</Badge>
        )}
        <Badge tone="neutral">{diceAvailable} dice</Badge>
        <Badge tone={pendingPoints > 0 ? 'win' : 'neutral'}>{pendingPoints.toLocaleString()} banked this turn</Badge>
        {selected.length > 0 && (
          <Badge tone={selectionScore ? 'gold' : 'lose'}>
            {selectionScore ? `+${selectionPoints.toLocaleString()} selected` : 'Selection does not score'}
          </Badge>
        )}
      </div>

      <div className="flex min-h-24 flex-wrap items-center justify-center gap-2 sm:gap-3">
        {rolled.length === 0 ? (
          <p className="text-ink-400">Roll to begin.</p>
        ) : (
          rolled.map((value, index) => (
            <Die
              key={`${index}-${value}`}
              value={value}
              selected={selected.includes(index)}
              scoring={scoringIndices.has(index)}
              disabled={disabled || !scoringIndices.has(index) || status !== 'awaiting-keep'}
              onToggle={() => onToggle(index)}
            />
          ))
        )}
      </div>

      {keeps.length > 0 && (
        <div className="rounded-lg border border-felt-500/25 bg-felt-950/40 px-4 py-3">
          <h3 className="mb-2 text-xs font-semibold tracking-[0.16em] text-ink-400 uppercase">This turn</h3>
          <ol className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {keeps.map((keep, index) => (
              <li key={index} className="flex items-center gap-2 text-ink-200">
                <span className="text-ink-600">{index + 1}.</span>
                <span className="flex gap-1">
                  {keep.dice.map((die, dieIndex) => (
                    <Die key={dieIndex} value={die} size="sm" />
                  ))}
                </span>
                <span className="font-semibold tabular-nums text-brass-300">+{keep.points.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
