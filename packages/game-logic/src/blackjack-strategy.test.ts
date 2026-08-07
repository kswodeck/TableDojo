import { describe, expect, it } from 'vitest';
import { basicStrategy, gradeDecision } from './blackjack-strategy.js';
import type { Card, Rank, Suit } from './poker.js';

function card(id: string): Card {
  const [rank, suit] = id.split('-').map(Number) as [Rank, Suit];
  return { rank, suit, id };
}
const cards = (...ids: string[]) => ids.map(card);

const FREE = { canDouble: true, canSplit: true };
const LOCKED = { canDouble: false, canSplit: false };

/** `play('8-1','8-2')` against a dealer upcard given by rank. */
const play = (hand: string[], upcardRank: number, context = FREE) =>
  basicStrategy(cards(...hand), card(`${upcardRank}-1`), context).action;

describe('pairs', () => {
  it('always splits aces and eights', () => {
    for (let up = 2; up <= 13; up++) {
      expect(play(['1-1', '1-2'], up)).toBe('split');
      expect(play(['8-1', '8-2'], up)).toBe('split');
    }
  });

  it('never splits tens or fives', () => {
    for (let up = 2; up <= 13; up++) {
      expect(play(['10-1', '13-2'], up)).not.toBe('split');
      expect(play(['5-1', '5-2'], up)).not.toBe('split');
    }
  });

  it('plays a pair of fives as a hard ten', () => {
    expect(play(['5-1', '5-2'], 6)).toBe('double');
    expect(play(['5-1', '5-2'], 10)).toBe('hit');
  });

  it('splits nines except against 7, 10 and ace', () => {
    expect(play(['9-1', '9-2'], 6)).toBe('split');
    expect(play(['9-1', '9-2'], 9)).toBe('split');
    expect(play(['9-1', '9-2'], 7)).toBe('stand');
    expect(play(['9-1', '9-2'], 10)).toBe('stand');
    expect(play(['9-1', '9-2'], 1)).toBe('stand');
  });

  it('splits sevens only against 2 through 7', () => {
    expect(play(['7-1', '7-2'], 7)).toBe('split');
    expect(play(['7-1', '7-2'], 8)).toBe('hit');
  });

  it('splits fours only against 5 and 6', () => {
    expect(play(['4-1', '4-2'], 5)).toBe('split');
    expect(play(['4-1', '4-2'], 6)).toBe('split');
    expect(play(['4-1', '4-2'], 4)).toBe('hit');
  });

  it('falls back to the hand total when splitting is not allowed', () => {
    const advice = basicStrategy(cards('8-1', '8-2'), card('10-1'), { canDouble: true, canSplit: false });
    expect(advice.ideal).toBe('split');
    expect(advice.action).toBe('hit'); // Hard 16 against a ten.
  });
});

describe('soft totals', () => {
  it('stands on soft 19 and 20', () => {
    expect(play(['1-1', '8-2'], 6)).toBe('stand');
    expect(play(['1-1', '9-2'], 6)).toBe('stand');
  });

  it('handles soft 18 by dealer strength', () => {
    expect(play(['1-1', '7-2'], 5)).toBe('double');
    expect(play(['1-1', '7-2'], 7)).toBe('stand');
    expect(play(['1-1', '7-2'], 8)).toBe('stand');
    expect(play(['1-1', '7-2'], 9)).toBe('hit');
    expect(play(['1-1', '7-2'], 1)).toBe('hit');
  });

  it('stands on soft 18 when it cannot double', () => {
    const advice = basicStrategy(cards('1-1', '7-2'), card('5-1'), LOCKED);
    expect(advice.ideal).toBe('double');
    expect(advice.action).toBe('stand');
  });

  it('hits other soft hands it cannot double', () => {
    const advice = basicStrategy(cards('1-1', '4-2'), card('5-1'), LOCKED);
    expect(advice.ideal).toBe('double');
    expect(advice.action).toBe('hit');
  });

  it('doubles soft 13-17 only in the documented windows', () => {
    expect(play(['1-1', '2-2'], 5)).toBe('double');
    expect(play(['1-1', '2-2'], 4)).toBe('hit');
    expect(play(['1-1', '4-2'], 4)).toBe('double');
    expect(play(['1-1', '4-2'], 3)).toBe('hit');
    expect(play(['1-1', '6-2'], 3)).toBe('double');
    expect(play(['1-1', '6-2'], 2)).toBe('hit');
  });
});

describe('hard totals', () => {
  it('stands on 17 and above', () => {
    for (let up = 2; up <= 13; up++) {
      expect(play(['10-1', '7-2'], up)).toBe('stand');
    }
  });

  it('stands on stiff hands against a weak dealer and hits against a strong one', () => {
    expect(play(['10-1', '6-2'], 6)).toBe('stand');
    expect(play(['10-1', '6-2'], 7)).toBe('hit');
    expect(play(['10-1', '3-2'], 2)).toBe('stand');
    expect(play(['10-1', '3-2'], 7)).toBe('hit');
  });

  it('stands on 12 only against 4, 5 and 6', () => {
    expect(play(['10-1', '2-2'], 3)).toBe('hit');
    expect(play(['10-1', '2-2'], 4)).toBe('stand');
    expect(play(['10-1', '2-2'], 6)).toBe('stand');
    expect(play(['10-1', '2-2'], 7)).toBe('hit');
  });

  it('doubles 11 except against an ace', () => {
    expect(play(['6-1', '5-2'], 10)).toBe('double');
    expect(play(['6-1', '5-2'], 1)).toBe('hit');
  });

  it('doubles 10 against 9 or lower', () => {
    expect(play(['6-1', '4-2'], 9)).toBe('double');
    expect(play(['6-1', '4-2'], 10)).toBe('hit');
    expect(play(['6-1', '4-2'], 1)).toBe('hit');
  });

  it('doubles 9 only against 3 through 6', () => {
    expect(play(['5-1', '4-2'], 3)).toBe('double');
    expect(play(['5-1', '4-2'], 6)).toBe('double');
    expect(play(['5-1', '4-2'], 2)).toBe('hit');
    expect(play(['5-1', '4-2'], 7)).toBe('hit');
  });

  it('always hits eight or less', () => {
    for (let up = 2; up <= 13; up++) {
      expect(play(['4-1', '4-2'], up === 5 || up === 6 ? 10 : up)).toBe('hit');
    }
  });
});

describe('advice payload', () => {
  it('always returns a legal action', () => {
    const advice = basicStrategy(cards('6-1', '5-2'), card('7-1'), LOCKED);
    expect(advice.action).toBe('hit');
    expect(advice.ideal).toBe('double');
    expect(advice.explanation).toContain('cannot double');
  });

  it('always carries an explanation for tutorial mode', () => {
    for (const hand of [['1-1', '7-2'], ['8-1', '8-2'], ['10-1', '6-2'], ['6-1', '5-2']]) {
      const advice = basicStrategy(cards(...hand), card('6-1'), FREE);
      expect(advice.explanation.length).toBeGreaterThan(20);
    }
  });
});

describe('gradeDecision', () => {
  it('marks the correct play right and anything else wrong', () => {
    const hand = cards('10-1', '6-2');
    const up = card('5-1');

    expect(gradeDecision(hand, up, FREE, 'stand').correct).toBe(true);
    expect(gradeDecision(hand, up, FREE, 'hit').correct).toBe(false);
    expect(gradeDecision(hand, up, FREE, 'hit').advice.explanation).toContain('Stand');
  });
});
