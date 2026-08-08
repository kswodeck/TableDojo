import { describe, expect, it } from 'vitest';
import {
  createDeck,
  deal,
  draw,
  evaluateHand,
  isJackOrBetter,
  MAX_BET,
  payout,
  ROYAL_FLUSH_MAX_BET_PAYOUT,
  type Card,
  type Rank,
  type Suit,
} from './poker.js';
import { seededRng } from './rng.js';

/** Terse hand builder: `hand('1-1', '13-1', '12-1', '11-1', '10-1')`. */
function hand(...ids: string[]): Card[] {
  return ids.map((id) => {
    const [rank, suit] = id.split('-').map(Number) as [Rank, Suit];
    return { rank, suit, id };
  });
}

describe('createDeck', () => {
  it('builds 52 distinct cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
  });
});

describe('evaluateHand', () => {
  it('ranks a royal flush', () => {
    expect(evaluateHand(hand('1-1', '13-1', '12-1', '11-1', '10-1'))).toBe('Royal Flush');
  });

  it('ranks a straight flush', () => {
    expect(evaluateHand(hand('9-2', '8-2', '7-2', '6-2', '5-2'))).toBe('Straight Flush');
  });

  it('does not call a wrapped run a straight', () => {
    // Q-K-A-2-3 is not a straight in any variant.
    expect(evaluateHand(hand('12-1', '13-2', '1-3', '2-4', '3-1'))).toBe('No Win');
  });

  it('ranks four of a kind above a flush', () => {
    expect(evaluateHand(hand('7-1', '7-2', '7-3', '7-4', '2-1'))).toBe('4 of a Kind');
  });

  it('ranks a full house', () => {
    expect(evaluateHand(hand('3-1', '3-2', '3-3', '9-1', '9-2'))).toBe('Full House');
  });

  it('ranks a plain flush', () => {
    expect(evaluateHand(hand('2-3', '5-3', '9-3', '11-3', '13-3'))).toBe('Flush');
  });

  it('ranks an ace-low straight', () => {
    expect(evaluateHand(hand('1-1', '2-2', '3-3', '4-4', '5-1'))).toBe('Straight');
  });

  it('ranks an ace-high straight', () => {
    expect(evaluateHand(hand('10-1', '11-2', '12-3', '13-4', '1-1'))).toBe('Straight');
  });

  it('ranks three of a kind', () => {
    expect(evaluateHand(hand('4-1', '4-2', '4-3', '9-1', '13-2'))).toBe('3 of a Kind');
  });

  it('ranks two pair', () => {
    expect(evaluateHand(hand('4-1', '4-2', '9-3', '9-1', '13-2'))).toBe('Two Pair');
  });

  it('pays a pair of jacks or better', () => {
    expect(evaluateHand(hand('11-1', '11-2', '3-3', '7-1', '9-2'))).toBe('Jacks or Better');
    expect(evaluateHand(hand('1-1', '1-2', '3-3', '7-1', '9-2'))).toBe('Jacks or Better');
  });

  it('does not pay a low pair', () => {
    expect(evaluateHand(hand('10-1', '10-2', '3-3', '7-1', '9-2'))).toBe('No Win');
  });

  it('rejects hands that are not five cards', () => {
    expect(() => evaluateHand(hand('1-1', '2-1'))).toThrow(RangeError);
  });
});

describe('isJackOrBetter', () => {
  it('covers ace, jack, queen and king only', () => {
    const paying = ([1, 11, 12, 13] as Rank[]).every(isJackOrBetter);
    const notPaying = ([2, 3, 4, 5, 6, 7, 8, 9, 10] as Rank[]).some(isJackOrBetter);
    expect(paying).toBe(true);
    expect(notPaying).toBe(false);
  });
});

describe('payout', () => {
  it('follows the 9/6 pay table', () => {
    expect(payout('Full House', 1)).toBe(9);
    expect(payout('Flush', 1)).toBe(6);
    expect(payout('Two Pair', 3)).toBe(6);
    expect(payout('4 of a Kind', 2)).toBe(50);
  });

  it('pays the jackpot for a royal flush at max bet', () => {
    expect(payout('Royal Flush', MAX_BET)).toBe(ROYAL_FLUSH_MAX_BET_PAYOUT);
    expect(payout('Royal Flush', 4)).toBe(1000);
  });

  it('pays nothing for a losing hand', () => {
    expect(payout('No Win', MAX_BET)).toBe(0);
  });
});

describe('deal and draw', () => {
  it('deals five cards and keeps 47 in the stock', () => {
    const { hand: dealt, stock } = deal(seededRng(42));
    expect(dealt).toHaveLength(5);
    expect(stock).toHaveLength(47);
    expect(new Set([...dealt, ...stock].map((c) => c.id)).size).toBe(52);
  });

  it('keeps held cards in place and replaces the rest in order', () => {
    const original = hand('1-1', '2-2', '3-3', '4-4', '5-1');
    const stock = hand('13-1', '13-2', '13-3');
    const result = draw(original, stock, [true, false, true, false, false]);

    expect(result.map((c) => c.id)).toEqual(['1-1', '13-1', '3-3', '13-2', '13-3']);
  });

  it('never introduces a duplicate card across a full deal and draw', () => {
    const rng = seededRng(7);
    for (let round = 0; round < 200; round++) {
      const { hand: dealt, stock } = deal(rng);
      const holds = dealt.map(() => rng() > 0.5);
      const final = draw(dealt, stock, holds);
      expect(new Set(final.map((c) => c.id)).size).toBe(5);
    }
  });

  it('refuses a draw when the stock is too small', () => {
    const original = hand('1-1', '2-2', '3-3', '4-4', '5-1');
    expect(() => draw(original, hand('13-1'), [false, false, false, false, false])).toThrow(RangeError);
  });
});
