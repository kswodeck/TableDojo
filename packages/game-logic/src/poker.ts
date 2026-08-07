import { shuffle, type Rng, defaultRng } from './rng.js';

/**
 * Jacks or Better video poker.
 *
 * Ranks are 1-13 with 1 = Ace, 11 = Jack, 12 = Queen, 13 = King.
 * Suits are 1-4. Both are numeric because the card art is stored as
 * `/images/cards/{rank}-{suit}.webp`.
 */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type Suit = 1 | 2 | 3 | 4;

export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
  /** Stable `rank-suit` key, also the image basename. */
  readonly id: string;
}

export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
export const SUITS: readonly Suit[] = [1, 2, 3, 4];

export const HAND_SIZE = 5;

export type HandRank =
  | 'Royal Flush'
  | 'Straight Flush'
  | '4 of a Kind'
  | 'Full House'
  | 'Flush'
  | 'Straight'
  | '3 of a Kind'
  | 'Two Pair'
  | 'Jacks or Better'
  | 'No Win';

/**
 * 9/6 Jacks or Better pay table, expressed as coins won per coin bet.
 * A Royal Flush pays a bonus at max bet (4000 for 5 coins instead of 1250),
 * which is what makes betting max the correct strategy.
 */
export const PAY_TABLE: Readonly<Record<Exclude<HandRank, 'No Win'>, number>> = {
  'Royal Flush': 250,
  'Straight Flush': 50,
  '4 of a Kind': 25,
  'Full House': 9,
  Flush: 6,
  Straight: 4,
  '3 of a Kind': 3,
  'Two Pair': 2,
  'Jacks or Better': 1,
};

export const MIN_BET = 1;
export const MAX_BET = 5;
/** Royal Flush jackpot paid when the player bets the maximum. */
export const ROYAL_FLUSH_MAX_BET_PAYOUT = 4000;

export function cardId(rank: Rank, suit: Suit): string {
  return `${rank}-${suit}`;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push({ rank, suit, id: cardId(rank, suit) });
    }
  }
  return deck;
}

export function shuffledDeck(rng: Rng = defaultRng): Card[] {
  return shuffle(createDeck(), rng);
}

/** True for Ace, Jack, Queen, King — the ranks that pay as a lone pair. */
export function isJackOrBetter(rank: Rank): boolean {
  return rank === 1 || rank >= 11;
}

/** True for the five ranks that make up a Royal Flush. */
export function isRoyalRank(rank: Rank): boolean {
  return rank === 1 || rank >= 10;
}

function rankCounts(hand: readonly Card[]): Map<Rank, number> {
  const counts = new Map<Rank, number>();
  for (const card of hand) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  }
  return counts;
}

function isFlush(hand: readonly Card[]): boolean {
  const first = hand[0];
  return first !== undefined && hand.every((card) => card.suit === first.suit);
}

function isStraight(hand: readonly Card[]): boolean {
  const ranks = [...new Set(hand.map((card) => card.rank))];
  if (ranks.length !== HAND_SIZE) return false;

  // Ace plays high in a broadway straight (10-J-Q-K-A).
  const broadway = [1, 10, 11, 12, 13];
  if (broadway.every((rank) => ranks.includes(rank as Rank))) return true;

  // Five distinct ranks spanning exactly five values is a straight. Ace plays
  // low in A-2-3-4-5 for free, since Ace === 1.
  return Math.max(...ranks) - Math.min(...ranks) === HAND_SIZE - 1;
}

function isRoyal(hand: readonly Card[]): boolean {
  return hand.every((card) => isRoyalRank(card.rank));
}

/**
 * Classifies a five card hand. Categories are mutually exclusive and are
 * tested from strongest to weakest, so the first match is the payout.
 */
export function evaluateHand(hand: readonly Card[]): HandRank {
  if (hand.length !== HAND_SIZE) {
    throw new RangeError(`A poker hand must contain exactly ${HAND_SIZE} cards, received ${hand.length}`);
  }

  const counts = [...rankCounts(hand).values()].sort((a, b) => b - a);
  const [highestOfAKind = 0, secondOfAKind = 0] = counts;
  const flush = isFlush(hand);
  const straight = isStraight(hand);

  if (flush && straight) {
    return isRoyal(hand) ? 'Royal Flush' : 'Straight Flush';
  }
  if (highestOfAKind === 4) return '4 of a Kind';
  if (highestOfAKind === 3 && secondOfAKind === 2) return 'Full House';
  if (flush) return 'Flush';
  if (straight) return 'Straight';
  if (highestOfAKind === 3) return '3 of a Kind';
  if (highestOfAKind === 2 && secondOfAKind === 2) return 'Two Pair';

  if (highestOfAKind === 2) {
    const payingPair = [...rankCounts(hand).entries()].some(
      ([rank, count]) => count === 2 && isJackOrBetter(rank),
    );
    if (payingPair) return 'Jacks or Better';
  }

  return 'No Win';
}

/** Coins returned for a hand at the given bet. Zero for a losing hand. */
export function payout(rank: HandRank, bet: number): number {
  if (rank === 'No Win') return 0;
  if (rank === 'Royal Flush' && bet >= MAX_BET) return ROYAL_FLUSH_MAX_BET_PAYOUT;
  return PAY_TABLE[rank] * bet;
}

export interface DealResult {
  /** The five cards shown to the player. */
  hand: Card[];
  /** The remaining 47 cards, in order, that the draw will pull from. */
  stock: Card[];
}

export function deal(rng: Rng = defaultRng): DealResult {
  const deck = shuffledDeck(rng);
  return { hand: deck.slice(0, HAND_SIZE), stock: deck.slice(HAND_SIZE) };
}

/**
 * Replaces every card the player did not hold with the next card off the
 * stock. Holding is by index, so the returned hand keeps its on-screen order.
 */
export function draw(hand: readonly Card[], stock: readonly Card[], holds: readonly boolean[]): Card[] {
  if (hand.length !== HAND_SIZE) {
    throw new RangeError(`A poker hand must contain exactly ${HAND_SIZE} cards, received ${hand.length}`);
  }

  const replacementsNeeded = hand.filter((_, index) => !holds[index]).length;
  if (stock.length < replacementsNeeded) {
    throw new RangeError('Not enough cards left in the stock to complete the draw');
  }

  let nextCard = 0;
  return hand.map((card, index) => (holds[index] ? card : (stock[nextCard++] as Card)));
}

/** Ordered pay table rows for the on-screen odds panel. */
export const PAY_TABLE_ROWS: readonly { rank: Exclude<HandRank, 'No Win'>; multiplier: number }[] = (
  Object.keys(PAY_TABLE) as Exclude<HandRank, 'No Win'>[]
).map((rank) => ({ rank, multiplier: PAY_TABLE[rank] }));
