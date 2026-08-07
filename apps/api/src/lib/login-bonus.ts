import { DAILY_LOGIN_BONUS } from '../models/user.js';

export interface LoginBonusResult {
  awarded: number;
  streak: number;
  alreadyClaimedToday: boolean;
}

/**
 * Works out the daily login bonus from the last login timestamp.
 *
 * Kept as a pure function of (lastLogin, streak, now) so the calendar edge
 * cases are testable. The original compared date strings produced by slicing
 * `Date.prototype.toString()` and carried a `// this situation may be off`
 * comment, because it broke across month boundaries and time zones.
 *
 * Days are whole UTC days, so a player's bonus does not depend on where they
 * happen to be when they sign in.
 */
export function calculateLoginBonus(lastLogin: Date, currentStreak: number, now: Date = new Date()): LoginBonusResult {
  const dayOf = (date: Date) => Math.floor(date.getTime() / 86_400_000);
  const today = dayOf(now);
  const previous = dayOf(lastLogin);

  if (today === previous) {
    return { awarded: 0, streak: currentStreak, alreadyClaimedToday: true };
  }

  // Consecutive days extend the streak; any longer gap restarts it. A clock
  // that has gone backwards also restarts rather than paying out repeatedly.
  const streak = today - previous === 1 ? currentStreak + 1 : 1;

  return { awarded: streak * DAILY_LOGIN_BONUS, streak, alreadyClaimedToday: false };
}
