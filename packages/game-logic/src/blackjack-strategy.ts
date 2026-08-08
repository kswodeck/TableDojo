import { cardValue, handValue, type Action } from './blackjack.js';
import type { Card } from './poker.js';

/**
 * Basic strategy for the house rules in `blackjack.ts` (six decks, dealer
 * stands on soft 17, double after split allowed, no surrender).
 *
 * This is what makes blackjack the right game to build tutorial mode around:
 * for every player hand and dealer upcard there is exactly one mathematically
 * correct action, so the tutorial can mark a decision right or wrong without
 * hedging. The advisor returns both the ideal action and a legal fallback,
 * because the chart says things like "double, or hit if you cannot".
 */
export interface StrategyContext {
  canDouble: boolean;
  canSplit: boolean;
}

export interface StrategyAdvice {
  /** The action to take given what is currently legal. */
  readonly action: Action;
  /** What the chart says in the abstract, ignoring legality. */
  readonly ideal: Action;
  /** Plain-language reasoning, shown by tutorial mode. */
  readonly explanation: string;
}

/** Dealer upcard as a blackjack value, with ace as 11. */
export function upcardValue(card: Card): number {
  return cardValue(card.rank);
}

function inRange(value: number, low: number, high: number): boolean {
  return value >= low && value <= high;
}

interface ChartEntry {
  readonly ideal: Action;
  /** What to do when `ideal` is not legal. The chart states this explicitly. */
  readonly fallback?: Action;
  readonly explanation: string;
}

function pairAdvice(pairValue: number, up: number): ChartEntry | null {
  switch (pairValue) {
    case 11:
      return { ideal: 'split', explanation: 'Always split aces — two hands starting with an ace beat one soft 12.' };
    case 10:
      return null; // A pair of tens is a 20; never split it.
    case 9:
      return inRange(up, 2, 6) || inRange(up, 8, 9)
        ? { ideal: 'split', explanation: 'Split nines against everything except 7, 10 and ace, where 18 is already strong enough.' }
        : { ideal: 'stand', explanation: 'Stand on 18 here — against a 7, 10 or ace, splitting nines gives back value.' };
    case 8:
      return { ideal: 'split', explanation: 'Always split eights — 16 is the worst hand in the game, and two hands of 8 are far better.' };
    case 7:
      return inRange(up, 2, 7)
        ? { ideal: 'split', explanation: 'Split sevens against a weak-to-middling upcard; 14 is a losing hand.' }
        : null;
    case 6:
      return inRange(up, 2, 6)
        ? { ideal: 'split', explanation: 'Split sixes against a bust-prone dealer card rather than playing a 12.' }
        : null;
    case 5:
      return null; // Play it as a hard 10.
    case 4:
      return inRange(up, 5, 6)
        ? { ideal: 'split', explanation: 'Split fours only against a 5 or 6, and only because doubling after the split is allowed.' }
        : null;
    case 3:
    case 2:
      return inRange(up, 2, 7)
        ? { ideal: 'split', explanation: 'Split low pairs against 2 through 7 — each hand starts better than a hard 4 through 6.' }
        : null;
    default:
      return null;
  }
}

function softAdvice(total: number, up: number): ChartEntry {
  if (total >= 19) {
    return { ideal: 'stand', explanation: 'Soft 19 or better is already a winning hand — take it.' };
  }
  if (total === 18) {
    if (inRange(up, 2, 6)) {
      return {
        ideal: 'double',
        fallback: 'stand',
        explanation: 'Soft 18 against a weak dealer card: double, since you cannot bust and the dealer probably will.',
      };
    }
    if (inRange(up, 7, 8)) {
      return { ideal: 'stand', explanation: 'Stand on soft 18 against a 7 or 8 — you are likely already ahead or tied.' };
    }
    return { ideal: 'hit', explanation: 'Soft 18 loses to a 9, 10 or ace more often than not, and you cannot bust by taking one card.' };
  }
  if (total === 17) {
    return inRange(up, 3, 6)
      ? { ideal: 'double', explanation: 'Soft 17 doubles against 3 through 6 — the dealer is most likely to bust here.' }
      : { ideal: 'hit', explanation: 'Soft 17 never stands; a free card can only improve it.' };
  }
  if (inRange(total, 15, 16)) {
    return inRange(up, 4, 6)
      ? { ideal: 'double', explanation: 'Soft 15 and 16 double against 4 through 6, the dealer’s weakest cards.' }
      : { ideal: 'hit', explanation: 'Take a card — a soft hand cannot bust on one draw.' };
  }
  // Soft 13 and 14.
  return inRange(up, 5, 6)
    ? { ideal: 'double', explanation: 'Soft 13 and 14 double only against a 5 or 6.' }
    : { ideal: 'hit', explanation: 'Take a card — a soft hand cannot bust on one draw.' };
}

function hardAdvice(total: number, up: number): ChartEntry {
  if (total >= 17) {
    return { ideal: 'stand', explanation: 'Stand on hard 17 or better — the risk of busting outweighs any improvement.' };
  }
  if (inRange(total, 13, 16)) {
    return inRange(up, 2, 6)
      ? { ideal: 'stand', explanation: 'Stand and let the dealer bust — with 2 through 6 showing they break more than 40% of the time.' }
      : { ideal: 'hit', explanation: 'The dealer is strong here, so a stiff hand has to take the risk and improve.' };
  }
  if (total === 12) {
    return inRange(up, 4, 6)
      ? { ideal: 'stand', explanation: 'Stand on 12 against 4, 5 or 6 only — those are the dealer’s three worst upcards.' }
      : { ideal: 'hit', explanation: 'Hit 12 against everything except 4, 5 and 6; only a ten busts you.' };
  }
  if (total === 11) {
    return up === 11
      ? { ideal: 'hit', explanation: 'Against an ace, just hit 11 — the dealer’s blackjack chance makes doubling too expensive.' }
      : { ideal: 'double', explanation: 'Double 11 — no single card busts you and a ten gives you 21.' };
  }
  if (total === 10) {
    return inRange(up, 2, 9)
      ? { ideal: 'double', explanation: 'Double 10 against 9 or lower — you are favoured to make 20.' }
      : { ideal: 'hit', explanation: 'Against a 10 or ace, just hit — the dealer is too likely to have you beaten.' };
  }
  if (total === 9) {
    return inRange(up, 3, 6)
      ? { ideal: 'double', explanation: 'Double 9 against 3 through 6, where the dealer is most likely to break.' }
      : { ideal: 'hit', explanation: 'Hit 9 — not enough of an edge to double here.' };
  }
  return { ideal: 'hit', explanation: 'Always hit 8 or less; there is no way to bust.' };
}

/**
 * The correct play for a hand. `context` describes what is currently legal, so
 * the returned `action` is always something the player can actually do.
 */
export function basicStrategy(
  cards: readonly Card[],
  dealerUpcard: Card,
  context: StrategyContext,
): StrategyAdvice {
  const up = upcardValue(dealerUpcard);
  const value = handValue(cards);

  const first = cards[0];
  const second = cards[1];
  const isPair =
    cards.length === 2 && first !== undefined && second !== undefined && cardValue(first.rank) === cardValue(second.rank);

  if (isPair) {
    const advice = pairAdvice(cardValue(first.rank), up);
    if (advice) {
      if (advice.ideal !== 'split') return legalise(advice, context);
      if (context.canSplit) {
        return { action: 'split', ideal: 'split', explanation: advice.explanation };
      }

      // Splitting is blocked (usually the four-hand cap), so the hand is played
      // on its total instead. `ideal` still reports split, so tutorial mode can
      // say what the chart wanted and why it is unavailable.
      const onTotal = legalise(value.soft ? softAdvice(value.total, up) : hardAdvice(value.total, up), context);
      return {
        action: onTotal.action,
        ideal: 'split',
        explanation: `${advice.explanation} You cannot split now, so play it on its total: ${onTotal.action}.`,
      };
    }
  }

  const advice = value.soft ? softAdvice(value.total, up) : hardAdvice(value.total, up);
  return legalise(advice, context);
}

/** Downgrades an illegal ideal action to the chart's stated fallback. */
function legalise(advice: ChartEntry, context: StrategyContext): StrategyAdvice {
  const blocked =
    (advice.ideal === 'double' && !context.canDouble) || (advice.ideal === 'split' && !context.canSplit);

  if (!blocked) {
    return { action: advice.ideal, ideal: advice.ideal, explanation: advice.explanation };
  }

  const fallback = advice.fallback ?? 'hit';
  return {
    action: fallback,
    ideal: advice.ideal,
    explanation: `${advice.explanation} You cannot ${advice.ideal} now, so ${fallback}.`,
  };
}

/** Was the player's decision the correct one? Used to score tutorial mode. */
export function gradeDecision(
  cards: readonly Card[],
  dealerUpcard: Card,
  context: StrategyContext,
  chosen: Action,
): { correct: boolean; advice: StrategyAdvice } {
  const advice = basicStrategy(cards, dealerUpcard, context);
  return { correct: advice.action === chosen, advice };
}
