import { rollDice, type DieValue } from './farkle.js';
import { type Rng, defaultRng } from './rng.js';

export const MIN_DICE = 1;
export const MAX_DICE = 20;

export type DiceTally = Record<DieValue, number>;

export const emptyDiceTally = (): DiceTally => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });

export function rollTray(count: number, rng: Rng = defaultRng): DieValue[] {
  const clamped = Math.min(MAX_DICE, Math.max(MIN_DICE, Math.floor(count) || MIN_DICE));
  return rollDice(clamped, rng);
}

export function tallyRoll(values: readonly DieValue[]): DiceTally {
  const tally = emptyDiceTally();
  for (const value of values) tally[value] += 1;
  return tally;
}

export function mergeTally(a: DiceTally, b: DiceTally): DiceTally {
  return { 1: a[1] + b[1], 2: a[2] + b[2], 3: a[3] + b[3], 4: a[4] + b[4], 5: a[5] + b[5], 6: a[6] + b[6] };
}

export function tallyTotal(tally: DiceTally): number {
  return tally[1] + tally[2] + tally[3] + tally[4] + tally[5] + tally[6];
}
