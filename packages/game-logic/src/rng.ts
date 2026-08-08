/**
 * A random number source returning a float in [0, 1).
 *
 * Every function in this package takes its randomness as a parameter so the
 * rules can be tested deterministically, and so the API can swap in a
 * cryptographically secure source for real-money-equivalent (coin) play.
 */
export type Rng = () => number;

export const defaultRng: Rng = Math.random;

/** Uniform integer in [min, max], inclusive. */
export function randomInt(min: number, max: number, rng: Rng = defaultRng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Fisher-Yates shuffle. Returns a new array; the input is never mutated.
 */
export function shuffle<T>(items: readonly T[], rng: Rng = defaultRng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = result[i] as T;
    const b = result[j] as T;
    result[i] = b;
    result[j] = a;
  }
  return result;
}

/**
 * Builds a deterministic RNG from a seed. Used by tests to pin outcomes, and
 * available to the API for reproducing a reported hand. Mulberry32.
 */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
