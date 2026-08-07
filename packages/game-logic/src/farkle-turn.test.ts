import { describe, expect, it } from 'vitest';
import { CASUAL_MULTIPLIER, type DieValue } from './farkle.js';
import { FarkleRuleError, bank, keep, roll, startTurn, type TurnState } from './farkle-turn.js';
import type { Rng } from './rng.js';

/**
 * An RNG that deals a scripted sequence of faces, so a whole turn can be
 * played out deterministically.
 */
function scriptedRng(faces: DieValue[]): Rng {
  let index = 0;
  return () => {
    const face = faces[index % faces.length] as DieValue;
    index += 1;
    return (face - 1) / 6 + 0.0001;
  };
}

const casualTurn = () => startTurn(CASUAL_MULTIPLIER);

describe('startTurn', () => {
  it('begins with six dice and nothing pending', () => {
    const state = casualTurn();
    expect(state.diceAvailable).toBe(6);
    expect(state.pendingPoints).toBe(0);
    expect(state.status).toBe('awaiting-roll');
  });
});

describe('roll', () => {
  it('produces as many dice as are available', () => {
    const state = roll(casualTurn(), scriptedRng([1, 2, 3, 4, 5, 6]));
    expect(state.rolled).toHaveLength(6);
    expect(state.category).toBe('Straight');
    expect(state.status).toBe('awaiting-keep');
  });

  it('ends the turn and wipes pending points on a farkle', () => {
    const first = roll(casualTurn(), scriptedRng([1, 2, 2, 3, 4, 6]));
    const kept = keep(first, [0]);
    expect(kept.pendingPoints).toBe(100);

    const farkled = roll(kept, scriptedRng([2, 3, 4, 6, 2, 3]));
    expect(farkled.status).toBe('farkled');
    expect(farkled.category).toBe('Farkle');
    expect(farkled.pendingPoints).toBe(0);
  });

  it('refuses to roll before the previous roll is resolved', () => {
    const state = roll(casualTurn(), scriptedRng([1, 2, 3, 4, 5, 6]));
    expect(() => roll(state, scriptedRng([1]))).toThrow(FarkleRuleError);
  });
});

describe('keep', () => {
  it('banks points and reduces the dice available', () => {
    const rolled = roll(casualTurn(), scriptedRng([1, 5, 2, 3, 4, 6]));
    const kept = keep(rolled, [0, 1]);

    expect(kept.pendingPoints).toBe(150);
    expect(kept.diceAvailable).toBe(4);
    expect(kept.status).toBe('awaiting-roll');
    expect(kept.keeps).toHaveLength(1);
    expect(kept.hotDice).toBe(false);
  });

  it('grants a fresh six dice when every die is kept', () => {
    const rolled = roll(casualTurn(), scriptedRng([1, 2, 3, 4, 5, 6]));
    const kept = keep(rolled, [0, 1, 2, 3, 4, 5]);

    expect(kept.pendingPoints).toBe(1500);
    expect(kept.hotDice).toBe(true);
    expect(kept.diceAvailable).toBe(6);
  });

  it('rejects a selection containing a die that scores nothing', () => {
    const rolled = roll(casualTurn(), scriptedRng([1, 2, 3, 4, 5, 6]));
    expect(() => keep(rolled, [0, 1])).toThrow(FarkleRuleError);
  });

  it('rejects an empty keep, so a turn cannot stall for free', () => {
    const rolled = roll(casualTurn(), scriptedRng([1, 2, 3, 4, 5, 6]));
    expect(() => keep(rolled, [])).toThrow(FarkleRuleError);
  });
});

describe('bank', () => {
  it('locks in the accumulated score', () => {
    const rolled = roll(casualTurn(), scriptedRng([1, 1, 2, 3, 4, 6]));
    const kept = keep(rolled, [0, 1]);
    const banked = bank(kept);

    expect(banked.status).toBe('banked');
    expect(banked.pendingPoints).toBe(200);
  });

  it('refuses to bank an empty turn', () => {
    expect(() => bank(casualTurn())).toThrow(FarkleRuleError);
  });

  it('refuses to bank while a roll is unresolved', () => {
    const rolled = roll(casualTurn(), scriptedRng([1, 2, 3, 4, 5, 6]));
    expect(() => bank(rolled)).toThrow(FarkleRuleError);
  });
});

describe('a full hot-dice run', () => {
  it('accumulates across re-rolls', () => {
    let state: TurnState = casualTurn();

    state = roll(state, scriptedRng([1, 1, 1, 5, 5, 5]));
    expect(state.category).toBe('2 Triplets');

    state = keep(state, [0, 1, 2, 3, 4, 5]);
    expect(state.pendingPoints).toBe(2500);
    expect(state.hotDice).toBe(true);

    state = roll(state, scriptedRng([1, 2, 3, 4, 6, 6]));
    state = keep(state, [0]);
    expect(state.pendingPoints).toBe(2600);
    expect(state.diceAvailable).toBe(5);

    state = bank(state);
    expect(state.status).toBe('banked');
    expect(state.keeps.map((k) => k.points)).toEqual([2500, 100]);
  });
});
