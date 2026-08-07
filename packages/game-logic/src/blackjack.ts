import { createDeck, type Card, type Rank } from './poker.js';
import { shuffle, type Rng, defaultRng } from './rng.js';

/**
 * Blackjack.
 *
 * House rules, chosen because they are the most commonly taught set and make
 * basic strategy exact:
 *   - six-deck shoe, freshly shuffled each round
 *   - dealer stands on all 17s, including soft 17 (S17)
 *   - blackjack pays 3:2
 *   - double on any first two cards, double after split allowed
 *   - split up to four hands; split aces receive one card each and stand
 *   - no insurance, no surrender
 *
 * A fresh shoe per round is deliberate: it keeps every round independent, so
 * the strategy advisor is always correct and there is no counting edge to farm
 * on the competitive leaderboard.
 */
export const DECKS_IN_SHOE = 6;
export const DEALER_STANDS_ON = 17;
export const BLACKJACK_PAYOUT = 1.5;
export const MAX_HANDS = 4;

export const MIN_BLACKJACK_BET = 1;
export const MAX_BLACKJACK_BET = 100;

export type Action = 'hit' | 'stand' | 'double' | 'split';

export type HandStatus = 'active' | 'stood' | 'busted' | 'blackjack';

export type HandOutcome = 'blackjack' | 'win' | 'push' | 'lose';

export interface BlackjackHand {
  readonly cards: readonly Card[];
  readonly bet: number;
  readonly status: HandStatus;
  /** True once the hand has doubled, which locks it after one more card. */
  readonly doubled: boolean;
  /** Split aces receive exactly one card and may not act again. */
  readonly fromSplitAce: boolean;
  readonly outcome?: HandOutcome;
  readonly payout?: number;
}

export interface BlackjackState {
  /** Undealt cards. Never sent to the client. */
  readonly shoe: readonly Card[];
  readonly hands: readonly BlackjackHand[];
  readonly activeHandIndex: number;
  readonly dealer: readonly Card[];
  readonly status: 'player-turn' | 'dealer-turn' | 'settled';
  /** Total returned to the player across all hands, set on settlement. */
  readonly totalPayout: number;
}

export class BlackjackRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlackjackRuleError';
  }
}

export function buildShoe(rng: Rng = defaultRng): Card[] {
  const cards: Card[] = [];
  for (let deck = 0; deck < DECKS_IN_SHOE; deck++) cards.push(...createDeck());
  return shuffle(cards, rng);
}

/** Blackjack value of a rank: ace counts 11 here and is demoted by handValue. */
export function cardValue(rank: Rank): number {
  if (rank === 1) return 11;
  return rank >= 10 ? 10 : rank;
}

export interface HandValue {
  /** Best total that does not bust, or the busted total. */
  readonly total: number;
  /** True when an ace is still counting as 11. */
  readonly soft: boolean;
  readonly busted: boolean;
}

export function handValue(cards: readonly Card[]): HandValue {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    total += cardValue(card.rank);
    if (card.rank === 1) aces += 1;
  }

  // Demote aces from 11 to 1 until the hand stops busting.
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return { total, soft: aces > 0, busted: total > 21 };
}

/** A natural: exactly two cards totalling 21, and not the result of a split. */
export function isNaturalBlackjack(hand: BlackjackHand): boolean {
  return hand.cards.length === 2 && handValue(hand.cards).total === 21 && !hand.fromSplitAce;
}

export function canSplit(state: BlackjackState, handIndex: number): boolean {
  const hand = state.hands[handIndex];
  if (!hand || hand.status !== 'active') return false;
  if (state.hands.length >= MAX_HANDS) return false;
  if (hand.cards.length !== 2 || hand.doubled) return false;

  const [first, second] = hand.cards;
  if (!first || !second) return false;
  // Any two ten-valued cards may be split, matching casino practice.
  return cardValue(first.rank) === cardValue(second.rank);
}

export function canDouble(state: BlackjackState, handIndex: number): boolean {
  const hand = state.hands[handIndex];
  return Boolean(hand && hand.status === 'active' && hand.cards.length === 2 && !hand.fromSplitAce);
}

export function availableActions(state: BlackjackState): Action[] {
  if (state.status !== 'player-turn') return [];

  const index = state.activeHandIndex;
  const hand = state.hands[index];
  if (!hand || hand.status !== 'active') return [];

  const actions: Action[] = ['hit', 'stand'];
  if (canDouble(state, index)) actions.push('double');
  if (canSplit(state, index)) actions.push('split');
  return actions;
}

function draw(shoe: readonly Card[]): { card: Card; rest: Card[] } {
  const [card, ...rest] = shoe;
  if (!card) throw new BlackjackRuleError('The shoe is empty');
  return { card, rest };
}

export function startRound(bet: number, rng: Rng = defaultRng): BlackjackState {
  if (!Number.isInteger(bet) || bet <= 0) {
    throw new BlackjackRuleError('A wager must be a positive whole number of coins');
  }

  let shoe: readonly Card[] = buildShoe(rng);
  const playerCards: Card[] = [];
  const dealerCards: Card[] = [];

  // Deal in casino order: player, dealer, player, dealer.
  for (let round = 0; round < 2; round++) {
    const playerDraw = draw(shoe);
    playerCards.push(playerDraw.card);
    const dealerDraw = draw(playerDraw.rest);
    dealerCards.push(dealerDraw.card);
    shoe = dealerDraw.rest;
  }

  const hand: BlackjackHand = {
    cards: playerCards,
    bet,
    status: 'active',
    doubled: false,
    fromSplitAce: false,
  };

  const state: BlackjackState = {
    shoe,
    hands: [hand],
    activeHandIndex: 0,
    dealer: dealerCards,
    status: 'player-turn',
    totalPayout: 0,
  };

  // A natural on either side ends the round immediately.
  if (handValue(playerCards).total === 21 || handValue(dealerCards).total === 21) {
    return settle({
      ...state,
      hands: [{ ...hand, status: handValue(playerCards).total === 21 ? 'blackjack' : 'stood' }],
      status: 'dealer-turn',
    });
  }

  return state;
}

function replaceHand(hands: readonly BlackjackHand[], index: number, hand: BlackjackHand): BlackjackHand[] {
  return hands.map((existing, position) => (position === index ? hand : existing));
}

/** Moves to the next hand that still needs a decision, or to the dealer. */
function advance(state: BlackjackState): BlackjackState {
  const nextIndex = state.hands.findIndex((hand, index) => index > state.activeHandIndex && hand.status === 'active');

  if (nextIndex !== -1) {
    return { ...state, activeHandIndex: nextIndex };
  }

  // Nothing left to play. Skip the dealer entirely if every hand is busted.
  const anyLive = state.hands.some((hand) => hand.status !== 'busted');
  return playDealer({ ...state, status: 'dealer-turn' }, anyLive);
}

function requireActiveHand(state: BlackjackState): BlackjackHand {
  if (state.status !== 'player-turn') {
    throw new BlackjackRuleError(`No decision is pending — the round is in the "${state.status}" phase`);
  }
  const hand = state.hands[state.activeHandIndex];
  if (!hand || hand.status !== 'active') {
    throw new BlackjackRuleError('That hand has already finished');
  }
  return hand;
}

export function hit(state: BlackjackState): BlackjackState {
  const hand = requireActiveHand(state);
  const { card, rest } = draw(state.shoe);

  const cards = [...hand.cards, card];
  const value = handValue(cards);
  const updated: BlackjackHand = {
    ...hand,
    cards,
    status: value.busted ? 'busted' : value.total === 21 ? 'stood' : 'active',
  };

  const next = { ...state, shoe: rest, hands: replaceHand(state.hands, state.activeHandIndex, updated) };
  return updated.status === 'active' ? next : advance(next);
}

export function stand(state: BlackjackState): BlackjackState {
  const hand = requireActiveHand(state);
  const hands = replaceHand(state.hands, state.activeHandIndex, { ...hand, status: 'stood' });
  return advance({ ...state, hands });
}

export function double(state: BlackjackState): BlackjackState {
  const hand = requireActiveHand(state);
  if (!canDouble(state, state.activeHandIndex)) {
    throw new BlackjackRuleError('You can only double on your first two cards');
  }

  const { card, rest } = draw(state.shoe);
  const cards = [...hand.cards, card];
  const value = handValue(cards);

  const updated: BlackjackHand = {
    ...hand,
    cards,
    bet: hand.bet * 2,
    doubled: true,
    status: value.busted ? 'busted' : 'stood',
  };

  return advance({ ...state, shoe: rest, hands: replaceHand(state.hands, state.activeHandIndex, updated) });
}

export function split(state: BlackjackState): BlackjackState {
  const hand = requireActiveHand(state);
  if (!canSplit(state, state.activeHandIndex)) {
    throw new BlackjackRuleError('That hand cannot be split');
  }

  const [first, second] = hand.cards as readonly [Card, Card];
  const splittingAces = first.rank === 1;

  // Each new hand immediately receives a second card.
  const firstDraw = draw(state.shoe);
  const secondDraw = draw(firstDraw.rest);

  const makeHand = (original: Card, drawn: Card): BlackjackHand => {
    const cards = [original, drawn];
    const value = handValue(cards);
    return {
      cards,
      bet: hand.bet,
      // Split aces get one card and stand; 21 after a split is not a natural.
      status: splittingAces || value.total === 21 ? 'stood' : 'active',
      doubled: false,
      fromSplitAce: splittingAces,
    };
  };

  const hands = [
    ...state.hands.slice(0, state.activeHandIndex),
    makeHand(first, firstDraw.card),
    makeHand(second, secondDraw.card),
    ...state.hands.slice(state.activeHandIndex + 1),
  ];

  const next: BlackjackState = { ...state, shoe: secondDraw.rest, hands };
  return hands[state.activeHandIndex]?.status === 'active' ? next : advance(next);
}

export function act(state: BlackjackState, action: Action): BlackjackState {
  switch (action) {
    case 'hit':
      return hit(state);
    case 'stand':
      return stand(state);
    case 'double':
      return double(state);
    case 'split':
      return split(state);
    default:
      throw new BlackjackRuleError(`Unknown action "${String(action)}"`);
  }
}

/** Draws for the dealer under S17, then settles. */
function playDealer(state: BlackjackState, shouldDraw: boolean): BlackjackState {
  let shoe = state.shoe;
  const dealer = [...state.dealer];

  if (shouldDraw) {
    while (handValue(dealer).total < DEALER_STANDS_ON) {
      const { card, rest } = draw(shoe);
      dealer.push(card);
      shoe = rest;
    }
  }

  return settle({ ...state, shoe, dealer });
}

export function settle(state: BlackjackState): BlackjackState {
  const dealerValue = handValue(state.dealer);
  const dealerNatural = state.dealer.length === 2 && dealerValue.total === 21;

  let totalPayout = 0;

  const hands = state.hands.map((hand): BlackjackHand => {
    const value = handValue(hand.cards);
    const natural = isNaturalBlackjack(hand);

    let outcome: HandOutcome;
    if (value.busted) {
      outcome = 'lose';
    } else if (natural && !dealerNatural) {
      outcome = 'blackjack';
    } else if (natural && dealerNatural) {
      outcome = 'push';
    } else if (dealerNatural) {
      outcome = 'lose';
    } else if (dealerValue.busted || value.total > dealerValue.total) {
      outcome = 'win';
    } else if (value.total === dealerValue.total) {
      outcome = 'push';
    } else {
      outcome = 'lose';
    }

    // Payout is what comes back to the player, stake included, because the
    // stake was debited when the round started.
    const payout =
      outcome === 'blackjack'
        ? Math.round(hand.bet * (1 + BLACKJACK_PAYOUT))
        : outcome === 'win'
          ? hand.bet * 2
          : outcome === 'push'
            ? hand.bet
            : 0;

    totalPayout += payout;
    return { ...hand, outcome, payout };
  });

  return { ...state, hands, status: 'settled', totalPayout };
}

/** Total staked across every hand, including doubles. Used to reconcile coins. */
export function totalStaked(state: BlackjackState): number {
  return state.hands.reduce((sum, hand) => sum + hand.bet, 0);
}
