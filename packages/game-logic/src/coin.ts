import { randomInt, type Rng, defaultRng } from './rng.js';

export type CoinSide = 'heads' | 'tails';

export function flipCoin(rng: Rng = defaultRng): CoinSide {
  return randomInt(1, 2, rng) === 1 ? 'heads' : 'tails';
}

export interface CoinTally {
  heads: number;
  tails: number;
}

export const emptyCoinTally = (): CoinTally => ({ heads: 0, tails: 0 });

export function addFlip(tally: CoinTally, side: CoinSide): CoinTally {
  return { ...tally, [side]: tally[side] + 1 };
}
