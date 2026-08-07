import { pbkdf2 as pbkdf2Callback, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyLegacyPassword, verifyPassword } from './password.js';

const pbkdf2 = promisify(pbkdf2Callback);

/** Reproduces a passport-local-mongoose hash from the pre-rewrite schema. */
async function legacyHash(password: string) {
  const salt = randomBytes(32).toString('hex');
  const derived = (await pbkdf2(password, Buffer.from(salt, 'hex'), 25000, 512, 'sha256')) as Buffer;
  return { salt, hash: derived.toString('hex') };
}

describe('hashPassword', () => {
  it('produces a verifiable, self-describing hash', async () => {
    const stored = await hashPassword('correct horse battery staple');

    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('correct horse battery staple', stored)).toBe(true);
  });

  it('rejects the wrong password', async () => {
    const stored = await hashPassword('correct horse battery staple');
    expect(await verifyPassword('Correct horse battery staple', stored)).toBe(false);
    expect(await verifyPassword('', stored)).toBe(false);
  });

  it('salts, so identical passwords hash differently', async () => {
    const [first, second] = await Promise.all([hashPassword('same password'), hashPassword('same password')]);
    expect(first).not.toBe(second);
    expect(await verifyPassword('same password', second)).toBe(true);
  });

  it('does not throw on a malformed or empty stored value', async () => {
    expect(await verifyPassword('anything', '')).toBe(false);
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('anything', 'scrypt$only$three$parts')).toBe(false);
  });
});

describe('verifyLegacyPassword', () => {
  it('accepts a password hashed by the original passport-local-mongoose setup', async () => {
    const { salt, hash } = await legacyHash('my old password');
    expect(await verifyLegacyPassword('my old password', salt, hash)).toBe(true);
  });

  it('rejects the wrong password against a legacy hash', async () => {
    const { salt, hash } = await legacyHash('my old password');
    expect(await verifyLegacyPassword('my new password', salt, hash)).toBe(false);
  });

  it('supports the upgrade path: verify legacy, then re-hash to scrypt', async () => {
    const password = 'legacy account password';
    const { salt, hash } = await legacyHash(password);

    expect(await verifyLegacyPassword(password, salt, hash)).toBe(true);

    const upgraded = await hashPassword(password);
    expect(await verifyPassword(password, upgraded)).toBe(true);
  });
});
