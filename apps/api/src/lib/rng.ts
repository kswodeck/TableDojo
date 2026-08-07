import { randomInt } from 'node:crypto';
import type { Rng } from '@tabledojo/game-logic';

/**
 * Cryptographically secure randomness for anything that moves coins.
 *
 * Math.random is fine for the casual games, but it is seeded predictably and
 * has no unpredictability guarantee, so it has no business dealing hands that
 * pay out. `crypto.randomInt` is uniform and unbiased.
 */
const RESOLUTION = 2 ** 30;

export const secureRng: Rng = () => randomInt(0, RESOLUTION) / RESOLUTION;
