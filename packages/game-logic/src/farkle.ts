import { randomInt, type Rng, defaultRng } from './rng.js';

/**
 * Farkle, using Table Dojo's house scoring table.
 *
 * All values below are "base units". A casual game multiplies them by
 * CASUAL_MULTIPLIER to get the familiar 100/50/1500 style numbers; a
 * competitive game multiplies them by the bet tier (1-5), so the same rules
 * drive both modes without duplicating the table.
 */
export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export const DICE_PER_TURN = 6;

/** Casual play shows scores at 50x base, matching the printed rules card. */
export const CASUAL_MULTIPLIER = 50;

/** Competitive bets are 10-50 coins in steps of 10, giving tiers 1-5. */
export const COMPETITIVE_BET_STEP = 10;
export const MIN_COMPETITIVE_BET = 10;
export const MAX_COMPETITIVE_BET = 50;

export const SCORE_UNITS = {
  /** A lone 1, when not consumed by a set. */
  singleOne: 2,
  /** A lone 5, when not consumed by a set. */
  singleFive: 1,
  /** 1-2-3-4-5-6 across all six dice. */
  straight: 30,
  /** Three distinct pairs across all six dice. */
  threePairs: 30,
  /** Two distinct triplets across all six dice. */
  twoTriplets: 50,
  fourOfAKind: 20,
  fiveOfAKind: 40,
  sixOfAKind: 60,
} as const;

/**
 * A triplet is worth face value x 2 base units, so three 4s = 8 units = 400
 * casual points. Three 1s are the documented exception: 1s always score
 * individually, making them 3 x singleOne = 6 units = 300 casual points.
 */
export function tripletUnits(value: DieValue): number {
  return value === 1 ? 3 * SCORE_UNITS.singleOne : value * 2;
}

export type RollCategory =
  | 'Straight'
  | '3 Pairs'
  | '2 Triplets'
  | '6 of a Kind'
  | '5 of a Kind'
  | '4 of a Kind'
  | '3 of a Kind'
  | 'Scoring Dice Rolled'
  | 'Farkle';

export function betTier(bet: number): number {
  return Math.round(bet / COMPETITIVE_BET_STEP);
}

export function rollDice(count: number, rng: Rng = defaultRng): DieValue[] {
  return Array.from({ length: count }, () => randomInt(1, 6, rng) as DieValue);
}

function tally(values: readonly DieValue[]): Map<DieValue, number> {
  const counts = new Map<DieValue, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function isStraight(counts: Map<DieValue, number>, total: number): boolean {
  return total === DICE_PER_TURN && counts.size === DICE_PER_TURN;
}

function isThreePairs(counts: Map<DieValue, number>, total: number): boolean {
  return total === DICE_PER_TURN && counts.size === 3 && [...counts.values()].every((n) => n === 2);
}

function isTwoTriplets(counts: Map<DieValue, number>, total: number): boolean {
  return total === DICE_PER_TURN && counts.size === 2 && [...counts.values()].every((n) => n === 3);
}

function setUnits(value: DieValue, count: number): number {
  switch (count) {
    case 6:
      return SCORE_UNITS.sixOfAKind;
    case 5:
      return SCORE_UNITS.fiveOfAKind;
    case 4:
      return SCORE_UNITS.fourOfAKind;
    case 3:
      return tripletUnits(value);
    default:
      return 0;
  }
}

/**
 * Scores a set of dice in base units, assuming every die in the set is being
 * kept. Returns the score plus which dice actually contributed, so callers can
 * reject a selection that includes dead dice.
 */
export interface ScoreResult {
  /** Score in base units. Multiply by the mode multiplier for display. */
  units: number;
  /** Indices of `values` that took part in a scoring combination. */
  scoringIndices: number[];
  /** True when every die in the selection contributed to the score. */
  usesEveryDie: boolean;
}

export function scoreDice(values: readonly DieValue[]): ScoreResult {
  const allIndices = values.map((_, index) => index);
  const counts = tally(values);
  const total = values.length;

  // Whole-roll combinations take precedence and consume all six dice.
  if (isStraight(counts, total)) {
    return { units: SCORE_UNITS.straight, scoringIndices: allIndices, usesEveryDie: true };
  }
  if (isThreePairs(counts, total)) {
    return { units: SCORE_UNITS.threePairs, scoringIndices: allIndices, usesEveryDie: true };
  }
  if (isTwoTriplets(counts, total)) {
    return { units: SCORE_UNITS.twoTriplets, scoringIndices: allIndices, usesEveryDie: true };
  }

  let units = 0;
  const scoring = new Set<DieValue>();

  for (const [value, count] of counts) {
    if (count >= 3) {
      units += setUnits(value, count);
      scoring.add(value);
    } else if (value === 1) {
      units += count * SCORE_UNITS.singleOne;
      scoring.add(value);
    } else if (value === 5) {
      units += count * SCORE_UNITS.singleFive;
      scoring.add(value);
    }
  }

  const scoringIndices = allIndices.filter((index) => scoring.has(values[index] as DieValue));
  return { units, scoringIndices, usesEveryDie: scoringIndices.length === total };
}

/**
 * The best score obtainable from a roll, ignoring which dice the player
 * chooses to keep. Used to decide whether a roll is a Farkle and to label it.
 */
export function classifyRoll(values: readonly DieValue[]): RollCategory {
  const counts = tally(values);
  const total = values.length;

  if (isStraight(counts, total)) return 'Straight';
  if (isThreePairs(counts, total)) return '3 Pairs';
  if (isTwoTriplets(counts, total)) return '2 Triplets';

  const largestSet = Math.max(0, ...counts.values());
  // Three 1s score as three individual 1s rather than as a set, so they are
  // labeled like ordinary scoring dice.
  if (largestSet >= 4) return (`${largestSet} of a Kind`) as RollCategory;
  if (largestSet === 3 && !(counts.get(1) === 3)) return '3 of a Kind';

  if (scoreDice(values).units > 0) return 'Scoring Dice Rolled';
  return 'Farkle';
}

/** A roll with no scoring dice at all ends the turn and wipes the score. */
export function isFarkle(values: readonly DieValue[]): boolean {
  return scoreDice(values).units === 0;
}

/**
 * "Hot dice": every die in the roll scores, so the player may re-roll all six
 * and keep accumulating.
 */
export function isHotDice(values: readonly DieValue[]): boolean {
  return values.length > 0 && scoreDice(values).usesEveryDie;
}

/**
 * Validates a player's keep-selection against the dice they were shown.
 *
 * Returns null when the selection is illegal — either it is empty or it
 * includes a die that scores nothing, which is how the original client-side
 * game could be tricked into banking points it had not earned.
 */
export function scoreSelection(
  rolled: readonly DieValue[],
  selectedIndices: readonly number[],
): ScoreResult | null {
  if (selectedIndices.length === 0) return null;

  const unique = new Set(selectedIndices);
  if (unique.size !== selectedIndices.length) return null;
  if (selectedIndices.some((index) => index < 0 || index >= rolled.length)) return null;

  const selected = selectedIndices.map((index) => rolled[index] as DieValue);
  const result = scoreDice(selected);
  if (result.units === 0 || !result.usesEveryDie) return null;

  return result;
}

/** Converts base units into the points shown for a given mode. */
export function toPoints(units: number, multiplier: number): number {
  return units * multiplier;
}
