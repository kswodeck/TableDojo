import { createHash, randomBytes } from 'node:crypto';
import { Router, type Request } from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';
import { hashPassword } from '../lib/password.js';
import { sendMail } from '../lib/mailer.js';
import { calculateLoginBonus } from '../lib/login-bonus.js';
import { findProfanity } from '../lib/profanity.js';
import { requireAuth, requireGuest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AVATARS, User, toPublicUser, type UserDocument } from '../models/user.js';

export const authRouter = Router();

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

/**
 * Credential endpoints are rate limited per IP. The original had no limiting
 * at all, so the login and "forgot username" routes could be brute forced or
 * mined for account data at full speed.
 */
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many attempts. Try again in a few minutes.' } },
});

const usernameSchema = z
  .string()
  .trim()
  .min(5, 'Username must be at least 5 characters')
  .max(25, 'Username must be 25 characters or fewer')
  .regex(/^[A-Za-z0-9._-]+$/, 'Username may only contain letters, numbers, dots, underscores and hyphens');

const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(200, 'Password must be 200 characters or fewer');

const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(60),
  password: passwordSchema,
  firstName: z.string().trim().max(40).default(''),
  lastName: z.string().trim().max(50).default(''),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD').optional(),
  profileImage: z.enum(AVATARS).default('smiley'),
});

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
});

/** Applies the daily bonus to the user document, leaving the save to the caller. */
function applyLoginBonus(user: UserDocument) {
  const bonus = calculateLoginBonus(user.lastLoginAt ?? new Date(0), user.loginStreak);

  if (!bonus.alreadyClaimedToday) {
    user.loginStreak = bonus.streak;
    user.coins += bonus.awarded;
    user.lastLoginAt = new Date();
  }

  return bonus;
}

function login(req: Request, user: UserDocument): Promise<void> {
  return new Promise((resolve, reject) => {
    req.login(user, (error) => (error ? reject(error as Error) : resolve()));
  });
}

/** Rotates the session id so a pre-auth cookie cannot be reused post-auth. */
function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

authRouter.post('/register', requireGuest, credentialLimiter, validate(registerSchema), async (req, res) => {
  const { username, email, password, firstName, lastName, birthday, profileImage } = req.body as z.infer<
    typeof registerSchema
  >;

  const offendingWord = findProfanity(username);
  if (offendingWord) {
    throw HttpError.badRequest('Please choose a different username', [
      { field: 'username', message: 'That username contains language we do not allow' },
    ]);
  }

  const [usernameTaken, emailTaken] = await Promise.all([
    User.exists({ usernameLower: username.toLowerCase() }),
    User.exists({ email }),
  ]);

  if (usernameTaken) {
    throw HttpError.conflict(`The username "${username}" is already registered`);
  }
  if (emailTaken) {
    throw HttpError.conflict(`The email "${email}" is already registered`);
  }

  const user = new User({
    username,
    email,
    firstName,
    lastName,
    profileImage,
    passwordHash: await hashPassword(password),
    ...(birthday ? { birthday: new Date(`${birthday}T12:00:00Z`) } : {}),
  });
  await user.save();

  await regenerateSession(req);
  await login(req, user);

  res.status(201).json({ user: toPublicUser(user), bonus: null });
});

authRouter.post('/login', requireGuest, credentialLimiter, validate(loginSchema), (req, res, next) => {
  passport.authenticate('local', (error: Error | null, user: UserDocument | false, info?: { message?: string }) => {
    void (async () => {
      try {
        if (error) return next(error);
        if (!user) return next(HttpError.unauthorized(info?.message ?? 'Incorrect username or password'));

        await regenerateSession(req);
        await login(req, user);

        const bonus = applyLoginBonus(user);
        if (!bonus.alreadyClaimedToday) await user.save();

        res.json({
          user: toPublicUser(user),
          bonus: bonus.alreadyClaimedToday ? null : { coins: bonus.awarded, streak: bonus.streak },
        });
      } catch (loginError) {
        next(loginError);
      }
    })();
  })(req, res, next);
});

authRouter.post('/logout', requireAuth, (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy((destroyError) => {
      if (destroyError) return next(destroyError);
      res.clearCookie(env.SESSION_COOKIE_NAME);
      res.status(204).end();
    });
  });
});

authRouter.get('/me', (req, res) => {
  res.json({ user: req.user ? toPublicUser(req.user) : null });
});

/**
 * Username recovery.
 *
 * The old route matched on email + phone + birthday and returned the username
 * straight in the response, which turned it into a lookup service for anyone
 * holding a leaked address. This only ever mails the address on file, and
 * always answers the same way so it cannot confirm whether an account exists.
 */
authRouter.post(
  '/forgot-username',
  requireGuest,
  credentialLimiter,
  validate(z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address') })),
  async (req, res) => {
    const { email } = req.body as { email: string };
    const user = await User.findOne({ email });

    if (user) {
      await sendMail({
        to: user.email,
        subject: 'Your Table Dojo username',
        text: `Your username is: ${user.username}\n\nIf you did not request this, you can ignore this email.`,
      });
    }

    res.json({ message: 'If that email is registered, we have sent the username to it.' });
  },
);

/**
 * Password reset request.
 *
 * The original set a `passwordRecoveryActive` flag and then redirected to
 * `/forgotpass?userId=<the user's real id>` — anyone who saw or guessed that
 * URL could set a new password with no proof of email ownership. This issues a
 * 32-byte single-use token, stores only its SHA-256 digest, expires it after an
 * hour, and mails the link to the registered address.
 */
authRouter.post(
  '/forgot-password',
  requireGuest,
  credentialLimiter,
  validate(z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address') })),
  async (req, res) => {
    const { email } = req.body as { email: string };
    const user = await User.findOne({ email });

    if (user) {
      const token = randomBytes(32).toString('hex');
      user.passwordResetTokenHash = createHash('sha256').update(token).digest('hex');
      user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
      await user.save();

      const link = `${env.WEB_ORIGIN}/reset-password?token=${token}&id=${user._id.toString()}`;
      await sendMail({
        to: user.email,
        subject: 'Reset your Table Dojo password',
        text: `Use this link within the next hour to choose a new password:\n\n${link}\n\nIf you did not request this, you can ignore this email and your password will stay the same.`,
      });
    }

    res.json({ message: 'If that email is registered, we have sent a reset link to it.' });
  },
);

authRouter.post(
  '/reset-password',
  requireGuest,
  credentialLimiter,
  validate(
    z.object({
      id: z.string().trim().min(1),
      token: z.string().trim().min(1),
      password: passwordSchema,
    }),
  ),
  async (req, res) => {
    const { id, token, password } = req.body as { id: string; token: string; password: string };
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      _id: id,
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      throw HttpError.badRequest('That reset link is invalid or has expired. Request a new one.');
    }

    user.passwordHash = await hashPassword(password);
    user.legacySalt = undefined;
    user.legacyHash = undefined;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    res.json({ message: 'Your password has been updated. You can now sign in.' });
  },
);
