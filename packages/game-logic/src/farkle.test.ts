import { describe, expect, it } from 'vitest';
import {
  CASUAL_MULTIPLIER,
  betTier,
  classifyRoll,
  isFarkle,
  isHotDice,
  rollDice,
  scoreDice,
  scoreSelection,
  toPoints,
  type DieValue,
} from './farkle.js';
import { seededRng } from './rng.js';

/** Score a roll in casual points, which is how the rules card reads. */
const casual = (values: DieValue[]) => toPoints(scoreDice(values).units, CASUAL_MULTIPLIER);

describe('scoreDice — casual point values', () => {
  it('scores single ones and fives', () => {
    expect(casual([1])).toBe(100);
    expect(casual([5])).toBe(50);
    expect(casual([1, 5])).toBe(150);
  });

  it('scores nothing for dead dice', () => {
    expect(casual([2])).toBe(0);
    expect(casual([2, 3, 4, 6])).toBe(0);
  });

  it('scores a six-die straight', () => {
    expect(casual([1, 2, 3, 4, 5, 6])).toBe(1500);
  });

  it('scores three pairs', () => {
    expect(casual([2, 2, 4, 4, 6, 6])).toBe(1500);
  });

  it('scores two triplets', () => {
    expect(casual([2, 2, 2, 3, 3, 3])).toBe(2500);
  });

  it('scores triplets at face value x100', () => {
    expect(casual([2, 2, 2])).toBe(200);
    expect(casual([3, 3, 3])).toBe(300);
    expect(casual([4, 4, 4])).toBe(400);
    expect(casual([5, 5, 5])).toBe(500);
    expect(casual([6, 6, 6])).toBe(600);
  });

  it('scores three ones individually, per the house rules card', () => {
    expect(casual([1, 1, 1])).toBe(300);
  });

  it('scores larger sets', () => {
    expect(casual([4, 4, 4, 4])).toBe(1000);
    expect(casual([4, 4, 4, 4, 4])).toBe(2000);
    expect(casual([4, 4, 4, 4, 4, 4])).toBe(3000);
  });

  it('adds loose scoring dice to a set', () => {
    // Three 2s (200) plus two loose 5s (100).
    expect(casual([2, 2, 2, 5, 5])).toBe(300);
    // Four 1s (1000) plus two loose 5s (100).
    expect(casual([1, 1, 1, 1, 5, 5])).toBe(1100);
  });

  it('ignores dead dice alongside a scoring set', () => {
    expect(casual([2, 2, 2, 2, 3, 3])).toBe(1000);
  });

  it('prefers the whole-roll combination over its parts', () => {
    // Two triplets pays 2500, well above 200 + 300 scored separately.
    expect(casual([2, 2, 2, 3, 3, 3])).toBeGreaterThan(casual([2, 2, 2]) + casual([3, 3, 3]));
  });

  it('reports which dice contributed', () => {
    const result = scoreDice([1, 2, 5, 3]);
    expect(result.scoringIndices).toEqual([0, 2]);
    expect(result.usesEveryDie).toBe(false);
  });
});

describe('competitive scoring', () => {
  it('scales with the bet tier', () => {
    const units = scoreDice([1, 2, 3, 4, 5, 6]).units;
    expect(toPoints(units, betTier(10))).toBe(30);
    expect(toPoints(units, betTier(50))).toBe(150);
  });

  it('maps 10-50 coin bets onto tiers 1-5', () => {
    expect([10, 20, 30, 40, 50].map(betTier)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('classifyRoll', () => {
  it('labels each category', () => {
    expect(classifyRoll([1, 2, 3, 4, 5, 6])).toBe('Straight');
    expect(classifyRoll([2, 2, 4, 4, 6, 6])).toBe('3 Pairs');
    expect(classifyRoll([2, 2, 2, 3, 3, 3])).toBe('2 Triplets');
    expect(classifyRoll([6, 6, 6, 6, 6, 6])).toBe('6 of a Kind');
    expect(classifyRoll([6, 6, 6, 6, 6, 2])).toBe('5 of a Kind');
    expect(classifyRoll([6, 6, 6, 6, 2, 3])).toBe('4 of a Kind');
    expect(classifyRoll([6, 6, 6, 2, 3, 4])).toBe('3 of a Kind');
    expect(classifyRoll([1, 2, 3])).toBe('Scoring Dice Rolled');
    expect(classifyRoll([2, 3, 4])).toBe('Farkle');
  });

  it('treats three ones as ordinary scoring dice, not a set', () => {
    expect(classifyRoll([1, 1, 1, 2, 3, 4])).toBe('Scoring Dice Rolled');
  });
});

describe('isFarkle', () => {
  it('is true only when nothing scores', () => {
    expect(isFarkle([2, 3, 4, 6])).toBe(true);
    expect(isFarkle([2, 3, 4, 5])).toBe(false);
    expect(isFarkle([3, 3, 3])).toBe(false);
  });
});

describe('isHotDice', () => {
  it('is true when every die scores', () => {
    expect(isHotDice([1, 2, 3, 4, 5, 6])).toBe(true);
    expect(isHotDice([1, 1, 1, 5, 5, 5])).toBe(true);
    expect(isHotDice([1, 5])).toBe(true);
    expect(isHotDice([1, 5, 2])).toBe(false);
  });
});

describe('scoreSelection', () => {
  const rolled: DieValue[] = [1, 2, 5, 5, 3, 4];

  it('accepts a selection of only scoring dice', () => {
    expect(scoreSelection(rolled, [0])?.units).toBe(2);
    expect(scoreSelection(rolled, [2, 3])?.units).toBe(2);
    expect(scoreSelection(rolled, [0, 2, 3])?.units).toBe(4);
  });

  it('rejects a selection containing a dead die', () => {
    expect(scoreSelection(rolled, [0, 1])).toBeNull();
    expect(scoreSelection(rolled, [4])).toBeNull();
  });

  it('rejects an empty selection', () => {
    expect(scoreSelection(rolled, [])).toBeNull();
  });

  it('rejects duplicated or out-of-range indices', () => {
    expect(scoreSelection(rolled, [0, 0])).toBeNull();
    expect(scoreSelection(rolled, [9])).toBeNull();
    expect(scoreSelection(rolled, [-1])).toBeNull();
  });

  it('rejects a partial set that leaves the set incomplete', () => {
    // Two of three 6s score nothing on their own.
    expect(scoreSelection([6, 6, 6, 2, 3, 4], [0, 1])).toBeNull();
    expect(scoreSelection([6, 6, 6, 2, 3, 4], [0, 1, 2])?.units).toBe(12);
  });
});

describe('rollDice', () => {
  it('only ever produces faces 1-6', () => {
    const rng = seededRng(99);
    const values = rollDice(600, rng);
    expect(values).toHaveLength(600);
    expect(values.every((v) => v >= 1 && v <= 6)).toBe(true);
  });

  it('covers every face over enough rolls', () => {
    const values = rollDice(600, seededRng(1));
    expect(new Set(values).size).toBe(6);
  });
});
