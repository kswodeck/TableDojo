import {
  DICE_PER_TURN,
  classifyRoll,
  isFarkle,
  rollDice,
  scoreSelection,
  toPoints,
  type DieValue,
  type RollCategory,
} from './farkle.js';
import { defaultRng, type Rng } from './rng.js';

/**
 * A single Farkle turn, modelled as an explicit state machine.
 *
 * The original game kept this in a dozen mutable module-level variables that
 * the DOM read and wrote directly, which is why held dice and hot-dice runs
 * drifted out of sync. Here every transition returns a new state, so the same
 * code can drive the casual browser game and the server-authoritative
 * competitive game.
 */
export type TurnStatus = 'awaiting-roll' | 'awaiting-keep' | 'farkled' | 'banked';

export interface KeepRecord {
  readonly dice: readonly DieValue[];
  readonly points: number;
}

export interface TurnState {
  /** Base-unit multiplier: 50 for casual, the bet tier (1-5) for competitive. */
  readonly multiplier: number;
  /** How many dice the next roll will use. */
  readonly diceAvailable: number;
  /** The dice currently on the table, empty before the first roll. */
  readonly rolled: readonly DieValue[];
  /** Label for the current roll, for the on-screen banner. */
  readonly category: RollCategory | null;
  /** Points kept so far this turn, not yet banked to the player's total. */
  readonly pendingPoints: number;
  /** One entry per keep, used to render the running tally. */
  readonly keeps: readonly KeepRecord[];
  readonly status: TurnStatus;
  /** True when the last keep used every die, freeing all six to be re-rolled. */
  readonly hotDice: boolean;
}

export function startTurn(multiplier: number): TurnState {
  return {
    multiplier,
    diceAvailable: DICE_PER_TURN,
    rolled: [],
    category: null,
    pendingPoints: 0,
    keeps: [],
    status: 'awaiting-roll',
    hotDice: false,
  };
}

export class FarkleRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FarkleRuleError';
  }
}

/** Rolls the dice still available. A scoreless roll ends the turn at zero. */
export function roll(state: TurnState, rng: Rng = defaultRng): TurnState {
  if (state.status !== 'awaiting-roll') {
    throw new FarkleRuleError(`Cannot roll while the turn is "${state.status}"`);
  }

  const rolled = rollDice(state.diceAvailable, rng);
  const category = classifyRoll(rolled);

  if (isFarkle(rolled)) {
    return {
      ...state,
      rolled,
      category,
      pendingPoints: 0,
      status: 'farkled',
      hotDice: false,
    };
  }

  return { ...state, rolled, category, status: 'awaiting-keep', hotDice: false };
}

/**
 * Keeps the selected dice and adds their score to the turn.
 *
 * Throws when the selection is empty or contains a die that scores nothing —
 * the check the original game only ever did in the browser, which meant the
 * coin balance it POSTed back could not be trusted.
 */
export function keep(state: TurnState, selectedIndices: readonly number[]): TurnState {
  if (state.status !== 'awaiting-keep') {
    throw new FarkleRuleError(`Cannot keep dice while the turn is "${state.status}"`);
  }

  const result = scoreSelection(state.rolled, selectedIndices);
  if (result === null) {
    throw new FarkleRuleError('Selection must contain at least one die and every die selected must score');
  }

  const points = toPoints(result.units, state.multiplier);
  const remaining = state.rolled.length - selectedIndices.length;
  // Keeping every die on the table earns a fresh set of six.
  const hotDice = remaining === 0;

  return {
    ...state,
    diceAvailable: hotDice ? DICE_PER_TURN : remaining,
    rolled: [],
    category: null,
    pendingPoints: state.pendingPoints + points,
    keeps: [...state.keeps, { dice: selectedIndices.map((i) => state.rolled[i] as DieValue), points }],
    status: 'awaiting-roll',
    hotDice,
  };
}

/** Locks in the turn score. Must follow a keep, not an unresolved roll. */
export function bank(state: TurnState): TurnState {
  if (state.status !== 'awaiting-roll' || state.pendingPoints === 0) {
    throw new FarkleRuleError('There is nothing to bank yet — keep at least one scoring die first');
  }
  return { ...state, status: 'banked' };
}

export const farkleTurn = { startTurn, roll, keep, bank };
