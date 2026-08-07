import { describe, expect, it } from 'vitest';
import { findProfanity, isProfane } from './profanity.js';

describe('findProfanity', () => {
  it('catches plain terms regardless of case', () => {
    expect(isProfane('what the fuck')).toBe(true);
    expect(isProfane('WHAT THE FUCK')).toBe(true);
  });

  it('catches separated spellings', () => {
    expect(isProfane('f-u-c-k this')).toBe(true);
    expect(isProfane('s h i t happens')).toBe(true);
  });

  it('catches leetspeak substitutions', () => {
    expect(isProfane('sh1t')).toBe(true);
    expect(isProfane('@ss')).toBe(true);
  });

  it('catches common suffixed forms', () => {
    expect(isProfane('you are shitting me')).toBe(true);
    expect(isProfane('bitches')).toBe(true);
  });

  it('reports which term matched', () => {
    expect(findProfanity('total bullshit')).toBe('shit');
    expect(findProfanity('perfectly fine text')).toBeNull();
  });

  /**
   * The Scunthorpe problem: the original matched bare substrings, so any post
   * containing "class", "assist" or "Scunthorpe" was rejected.
   */
  it('does not fire on innocent words that merely contain a term', () => {
    for (const phrase of [
      'the class starts at noon',
      'please assist me with this hand',
      'I grew up in Scunthorpe',
      'a bass guitar',
      'analysis of the pay table',
      'pass the dice',
      'a cocktail at the bar',
      'the assassin card',
      'basic strategy',
      'title of the post',
    ]) {
      expect(findProfanity(phrase), phrase).toBeNull();
    }
  });

  it('accepts ordinary game talk', () => {
    expect(isProfane('I hit on 16 against a dealer 10 and busted')).toBe(false);
    expect(isProfane('Three pairs scored 1500, then I farkled')).toBe(false);
  });
});
