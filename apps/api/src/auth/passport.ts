import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { User, type UserDocument } from '../models/user.js';
import { hashPassword, verifyLegacyPassword, verifyPassword } from '../lib/password.js';

/**
 * Username/password authentication.
 *
 * Lookup is by the lowercased username so "KSwodeck" and "kswodeck" resolve to
 * the same account, and the same generic failure message is returned whether
 * the username is unknown or the password is wrong, so the endpoint cannot be
 * used to enumerate accounts.
 */
const GENERIC_FAILURE = 'Incorrect username or password';

export function configurePassport(): void {
  passport.use(
    new LocalStrategy({ usernameField: 'username', passwordField: 'password' }, (username, password, done) => {
      void (async () => {
        try {
          const user = await User.findOne({ usernameLower: username.trim().toLowerCase() }).select(
            '+passwordHash +legacySalt +legacyHash',
          );

          if (!user) return done(null, false, { message: GENERIC_FAILURE });

          const authenticated = await authenticate(user, password);
          if (!authenticated) return done(null, false, { message: GENERIC_FAILURE });

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      })();
    }),
  );

  passport.serializeUser<string>((user, done) => {
    done(null, (user as UserDocument)._id.toString());
  });

  passport.deserializeUser<string>((id, done) => {
    void (async () => {
      try {
        const user = await User.findById(id);
        // A deleted account leaves a live session cookie behind; resolving to
        // `false` clears it rather than throwing on every request.
        done(null, user ?? false);
      } catch (error) {
        done(error as Error);
      }
    })();
  });
}

/**
 * Verifies a password against whichever scheme the account was created with,
 * upgrading legacy PBKDF2 accounts to scrypt on the way through.
 */
async function authenticate(user: UserDocument, password: string): Promise<boolean> {
  if (user.passwordHash) {
    return verifyPassword(password, user.passwordHash);
  }

  if (user.legacySalt && user.legacyHash) {
    const valid = await verifyLegacyPassword(password, user.legacySalt, user.legacyHash);
    if (!valid) return false;

    user.passwordHash = await hashPassword(password);
    user.legacySalt = undefined;
    user.legacyHash = undefined;
    await user.save();
    return true;
  }

  return false;
}
