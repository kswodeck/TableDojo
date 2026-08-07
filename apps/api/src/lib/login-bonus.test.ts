import { describe, expect, it } from 'vitest';
import { calculateLoginBonus } from './login-bonus.js';

const day = (offsetDays: number, hour = 12) =>
  new Date(Date.UTC(2026, 0, 10 + offsetDays, hour, 0, 0));

describe('calculateLoginBonus', () => {
  it('pays nothing for a second login on the same day', () => {
    const result = calculateLoginBonus(day(0, 1), 4, day(0, 23));
    expect(result).toEqual({ awarded: 0, streak: 4, alreadyClaimedToday: true });
  });

  it('extends the streak on consecutive days', () => {
    const result = calculateLoginBonus(day(0), 4, day(1));
    expect(result).toEqual({ awarded: 50, streak: 5, alreadyClaimedToday: false });
  });

  it('restarts the streak after a missed day', () => {
    const result = calculateLoginBonus(day(0), 9, day(2));
    expect(result).toEqual({ awarded: 10, streak: 1, alreadyClaimedToday: false });
  });

  it('scales the payout with the streak', () => {
    expect(calculateLoginBonus(day(0), 1, day(1)).awarded).toBe(20);
    expect(calculateLoginBonus(day(0), 9, day(1)).awarded).toBe(100);
  });

  it('handles a month boundary, which the original string comparison did not', () => {
    const jan31 = new Date(Date.UTC(2026, 0, 31, 20, 0, 0));
    const feb1 = new Date(Date.UTC(2026, 1, 1, 3, 0, 0));

    expect(calculateLoginBonus(jan31, 3, feb1)).toEqual({ awarded: 40, streak: 4, alreadyClaimedToday: false });
  });

  it('handles a year boundary', () => {
    const dec31 = new Date(Date.UTC(2025, 11, 31, 22, 0, 0));
    const jan1 = new Date(Date.UTC(2026, 0, 1, 6, 0, 0));

    expect(calculateLoginBonus(dec31, 2, jan1).streak).toBe(3);
  });

  it('treats a brand new account as a fresh streak', () => {
    expect(calculateLoginBonus(new Date(0), 1, day(0))).toEqual({
      awarded: 10,
      streak: 1,
      alreadyClaimedToday: false,
    });
  });

  it('restarts rather than paying out when the clock has gone backwards', () => {
    const result = calculateLoginBonus(day(5), 6, day(2));
    expect(result).toEqual({ awarded: 10, streak: 1, alreadyClaimedToday: false });
  });
});
