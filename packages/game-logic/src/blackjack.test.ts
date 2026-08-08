import { describe, expect, it } from 'vitest';
import {
  BlackjackRuleError,
  DECKS_IN_SHOE,
  availableActions,
  buildShoe,
  canSplit,
  double,
  handValue,
  hit,
  settle,
  split,
  stand,
  startRound,
  totalStaked,
  type BlackjackHand,
  type BlackjackState,
} from './blackjack.js';
import { seededRng } from './rng.js';
import type { Card, Rank, Suit } from './poker.js';

function card(id: string): Card {
  const [rank, suit] = id.split('-').map(Number) as [Rank, Suit];
  return { rank, suit, id };
}
const cards = (...ids: string[]) => ids.map(card);

/** Builds a state directly, so individual rules can be tested in isolation. */
function state(overrides: Partial<BlackjackState> & { hands: BlackjackHand[] }): BlackjackState {
  return {
    shoe: cards('5-1', '5-2', '5-3', '5-4', '6-1', '6-2', '6-3', '6-4'),
    activeHandIndex: 0,
    dealer: cards('10-1', '7-1'),
    status: 'player-turn',
    totalPayout: 0,
    ...overrides,
  };
}

const hand = (cardIds: string[], overrides: Partial<BlackjackHand> = {}): BlackjackHand => ({
  cards: cards(...cardIds),
  bet: 10,
  status: 'active',
  doubled: false,
  fromSplitAce: false,
  ...overrides,
});

describe('buildShoe', () => {
  it('contains six full decks', () => {
    const shoe = buildShoe(seededRng(3));
    expect(shoe).toHaveLength(52 * DECKS_IN_SHOE);
    expect(shoe.filter((c) => c.id === '1-1')).toHaveLength(DECKS_IN_SHOE);
  });
});

describe('handValue', () => {
  it('counts face cards as ten', () => {
    expect(handValue(cards('13-1', '12-2')).total).toBe(20);
  });

  it('counts an ace as eleven when it fits', () => {
    expect(handValue(cards('1-1', '6-2'))).toMatchObject({ total: 17, soft: true, busted: false });
  });

  it('demotes an ace to avoid busting', () => {
    expect(handValue(cards('1-1', '6-2', '10-3'))).toMatchObject({ total: 17, soft: false, busted: false });
  });

  it('demotes multiple aces one at a time', () => {
    expect(handValue(cards('1-1', '1-2'))).toMatchObject({ total: 12, soft: true });
    expect(handValue(cards('1-1', '1-2', '9-3'))).toMatchObject({ total: 21, soft: true });
    expect(handValue(cards('1-1', '1-2', '1-3', '9-4'))).toMatchObject({ total: 12, soft: false });
  });

  it('reports a bust', () => {
    expect(handValue(cards('10-1', '9-2', '5-3')).busted).toBe(true);
  });
});

describe('startRound', () => {
  it('deals two cards to each side', () => {
    const round = startRound(10, seededRng(11));
    expect(round.hands[0]!.cards).toHaveLength(2);
    expect(round.dealer).toHaveLength(2);
    expect(round.shoe).toHaveLength(52 * DECKS_IN_SHOE - 4);
  });

  it('rejects a non-positive wager', () => {
    expect(() => startRound(0, seededRng(1))).toThrow(BlackjackRuleError);
    expect(() => startRound(2.5, seededRng(1))).toThrow(BlackjackRuleError);
  });
});

describe('availableActions', () => {
  it('offers double and split on a fresh pair', () => {
    const s = state({ hands: [hand(['8-1', '8-2'])] });
    expect(availableActions(s).sort()).toEqual(['double', 'hit', 'split', 'stand']);
  });

  it('drops double once a third card arrives', () => {
    const s = state({ hands: [hand(['5-1', '4-2', '3-3'])] });
    expect(availableActions(s).sort()).toEqual(['hit', 'stand']);
  });

  it('offers nothing once the round is settled', () => {
    expect(availableActions(state({ hands: [hand(['10-1', '9-2'])], status: 'settled' }))).toEqual([]);
  });
});

describe('hit', () => {
  it('busts a hand that goes over 21', () => {
    const s = state({ hands: [hand(['10-1', '9-2'])], shoe: cards('13-1', '2-2') });
    const next = hit(s);
    expect(next.hands[0]!.status).toBe('busted');
  });

  it('automatically stands a hand that reaches 21', () => {
    const s = state({ hands: [hand(['10-1', '6-2'])], shoe: cards('5-1', '2-2') });
    expect(hit(s).hands[0]!.status).toBe('stood');
  });

  it('refuses to act on a finished hand', () => {
    const s = state({ hands: [hand(['10-1', '9-2'], { status: 'stood' })] });
    expect(() => hit(s)).toThrow(BlackjackRuleError);
  });
});

describe('double', () => {
  it('doubles the wager and takes exactly one card', () => {
    const s = state({ hands: [hand(['6-1', '5-2'])], shoe: cards('9-1', '2-2') });
    const next = double(s);

    expect(next.hands[0]!.bet).toBe(20);
    expect(next.hands[0]!.cards).toHaveLength(3);
    expect(next.hands[0]!.status).toBe('stood');
  });

  it('is refused after the first two cards', () => {
    const s = state({ hands: [hand(['5-1', '4-2', '2-3'])] });
    expect(() => double(s)).toThrow(BlackjackRuleError);
  });
});

describe('split', () => {
  it('turns one pair into two staked hands', () => {
    const s = state({ hands: [hand(['8-1', '8-2'])], shoe: cards('3-1', '9-2', '5-3') });
    const next = split(s);

    expect(next.hands).toHaveLength(2);
    expect(next.hands.map((h) => h.bet)).toEqual([10, 10]);
    expect(next.hands[0]!.cards.map((c) => c.id)).toEqual(['8-1', '3-1']);
    expect(next.hands[1]!.cards.map((c) => c.id)).toEqual(['8-2', '9-2']);
    expect(totalStaked(next)).toBe(20);
  });

  it('gives split aces one card each and stands them', () => {
    const s = state({ hands: [hand(['1-1', '1-2'])], shoe: cards('13-1', '9-2', '5-3') });
    const next = split(s);

    expect(next.hands.every((h) => h.status === 'stood')).toBe(true);
    expect(next.hands.every((h) => h.fromSplitAce)).toBe(true);
    // 21 on split aces is 21, not a natural blackjack.
    expect(next.hands[0]!.outcome).not.toBe('blackjack');
  });

  it('allows splitting two different ten-valued cards', () => {
    expect(canSplit(state({ hands: [hand(['13-1', '10-2'])] }), 0)).toBe(true);
  });

  it('refuses a non-pair', () => {
    expect(() => split(state({ hands: [hand(['8-1', '9-2'])] }))).toThrow(BlackjackRuleError);
  });

  it('caps the table at four hands', () => {
    const s = state({
      hands: [hand(['8-1', '8-2']), hand(['8-3', '8-4']), hand(['9-1', '9-2']), hand(['9-3', '9-4'])],
    });
    expect(canSplit(s, 0)).toBe(false);
  });
});

describe('turn order', () => {
  it('moves to the next hand when one stands', () => {
    const s = state({ hands: [hand(['5-1', '6-2']), hand(['7-1', '8-2'])] });
    expect(stand(s).activeHandIndex).toBe(1);
  });

  it('runs the dealer once every hand is done', () => {
    const s = state({ hands: [hand(['10-1', '9-2'])], dealer: cards('7-1', '6-2'), shoe: cards('5-1') });
    const next = stand(s);

    expect(next.status).toBe('settled');
    // Dealer had 13 and must draw to at least 17.
    expect(handValue(next.dealer).total).toBeGreaterThanOrEqual(17);
  });

  it('does not draw for the dealer when every hand busted', () => {
    const s = state({ hands: [hand(['10-1', '9-2'])], dealer: cards('7-1', '6-2'), shoe: cards('13-1', '2-2') });
    const next = hit(s);

    expect(next.hands[0]!.status).toBe('busted');
    expect(next.dealer).toHaveLength(2);
    expect(next.hands[0]!.payout).toBe(0);
  });
});

describe('settle', () => {
  const settled = (playerCards: string[], dealerCards: string[], overrides: Partial<BlackjackHand> = {}) =>
    settle(state({ hands: [hand(playerCards, overrides)], dealer: cards(...dealerCards), status: 'dealer-turn' }))
      .hands[0]!;

  it('pays a natural at 3:2', () => {
    const result = settled(['1-1', '13-2'], ['10-1', '9-2']);
    expect(result.outcome).toBe('blackjack');
    expect(result.payout).toBe(25); // 10 stake + 15 winnings
  });

  it('pushes two naturals', () => {
    const result = settled(['1-1', '13-2'], ['1-3', '12-4']);
    expect(result.outcome).toBe('push');
    expect(result.payout).toBe(10);
  });

  it('loses to a dealer natural', () => {
    const result = settled(['10-1', '9-2'], ['1-3', '12-4']);
    expect(result.outcome).toBe('lose');
    expect(result.payout).toBe(0);
  });

  it('pays even money on a normal win', () => {
    const result = settled(['10-1', '9-2'], ['10-3', '8-4']);
    expect(result.outcome).toBe('win');
    expect(result.payout).toBe(20);
  });

  it('wins when the dealer busts', () => {
    expect(settled(['10-1', '5-2'], ['10-3', '8-4', '9-1']).outcome).toBe('win');
  });

  it('loses a busted hand even if the dealer also busts', () => {
    const result = settled(['10-1', '9-2', '8-3'], ['10-3', '8-4', '9-1']);
    expect(result.outcome).toBe('lose');
    expect(result.payout).toBe(0);
  });

  it('pushes an equal total', () => {
    expect(settled(['10-1', '9-2'], ['10-3', '9-4']).outcome).toBe('push');
  });

  it('treats 21 on three cards as a normal win, not a blackjack', () => {
    const result = settled(['5-1', '6-2', '10-3'], ['10-4', '9-1']);
    expect(result.outcome).toBe('win');
    expect(result.payout).toBe(20);
  });

  it('totals the payout across split hands', () => {
    const result = settle(
      state({
        hands: [hand(['10-1', '9-2']), hand(['10-3', '5-4'])],
        dealer: cards('10-4', '8-1'),
        status: 'dealer-turn',
      }),
    );
    // First hand wins 20, second loses.
    expect(result.totalPayout).toBe(20);
  });
});

describe('a full round never leaks or duplicates cards', () => {
  it('keeps the shoe consistent across many rounds', () => {
    const rng = seededRng(2024);
    for (let round = 0; round < 100; round++) {
      let current = startRound(10, rng);
      let guard = 0;

      while (current.status === 'player-turn' && guard++ < 20) {
        const actions = availableActions(current);
        current = actions.includes('hit') && handValue(current.hands[current.activeHandIndex]!.cards).total < 12
          ? hit(current)
          : stand(current);
      }

      const dealt = [...current.hands.flatMap((h) => h.cards), ...current.dealer];
      expect(current.status).toBe('settled');
      expect(dealt.length + current.shoe.length).toBe(52 * DECKS_IN_SHOE);
    }
  });
});
