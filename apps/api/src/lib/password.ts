import {
  randomBytes,
  pbkdf2 as pbkdf2Callback,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';
import { promisify } from 'node:util';

// promisify resolves to the 3-argument overload, so the options-taking form is
// re-typed here rather than dropping the tuning parameters.
const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

const pbkdf2 = promisify(pbkdf2Callback);

/**
 * Password hashing.
 *
 * New passwords use scrypt with OWASP-recommended parameters. scrypt ships in
 * Node's standard library, so there is no native module to compile at deploy
 * time — the main reason to prefer it over argon2 here.
 *
 * Accounts created by the original app were hashed by passport-local-mongoose
 * (PBKDF2-SHA256, 25000 iterations, 512-byte key) and stored `salt` and `hash`
 * as separate fields. `verifyLegacy` still accepts those, and the login route
 * transparently re-hashes to scrypt on the next successful sign-in, so the
 * existing user base keeps working without a forced password reset.
 */

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_BYTES = 16;
const SCRYPT_PARAMS = { N: 2 ** 15, r: 8, p: 1, maxmem: 96 * 1024 * 1024 } as const;

const LEGACY_ITERATIONS = 25000;
const LEGACY_KEY_LENGTH = 512;
const LEGACY_DIGEST = 'sha256';

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const derived = await scrypt(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_PARAMS);
  return ['scrypt', SCRYPT_PARAMS.N, SCRYPT_PARAMS.r, SCRYPT_PARAMS.p, salt.toString('hex'), derived.toString('hex')].join(
    '$',
  );
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !n || !r || !p || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  const derived = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT_PARAMS.maxmem,
  });

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Verifies a passport-local-mongoose PBKDF2 hash from the pre-rewrite schema. */
export async function verifyLegacyPassword(password: string, saltHex: string, hashHex: string): Promise<boolean> {
  const expected = Buffer.from(hashHex, 'hex');
  const derived = (await pbkdf2(
    password,
    Buffer.from(saltHex, 'hex'),
    LEGACY_ITERATIONS,
    LEGACY_KEY_LENGTH,
    LEGACY_DIGEST,
  )) as Buffer;

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
