import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';
import { hashPassword, verifyLegacyPassword, verifyPassword } from '../lib/password.js';
import { findProfanity } from '../lib/profanity.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AVATARS, User, toPublicUser, type UserDocument } from '../models/user.js';
import { Post } from '../models/post.js';

export const accountRouter = Router();

accountRouter.use(requireAuth);

const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(5, 'Username must be at least 5 characters')
    .max(25, 'Username must be 25 characters or fewer')
    .regex(/^[A-Za-z0-9._-]+$/, 'Username may only contain letters, numbers, dots, underscores and hyphens'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(60),
  firstName: z.string().trim().max(40).default(''),
  lastName: z.string().trim().max(50).default(''),
  phone: z
    .string()
    .trim()
    .max(16)
    .regex(/^[0-9+()\-.\s]*$/, 'Enter a valid phone number')
    .default(''),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD').nullish(),
  profileImage: z.enum(AVATARS),
});

async function verifyCurrentPassword(user: UserDocument, password: string): Promise<boolean> {
  const withSecrets = await User.findById(user._id).select('+passwordHash +legacySalt +legacyHash');
  if (!withSecrets) return false;

  if (withSecrets.passwordHash) return verifyPassword(password, withSecrets.passwordHash);
  if (withSecrets.legacySalt && withSecrets.legacyHash) {
    return verifyLegacyPassword(password, withSecrets.legacySalt, withSecrets.legacyHash);
  }
  return false;
}

accountRouter.get('/', (req, res) => {
  res.json({ user: toPublicUser(currentUser(req)) });
});

/**
 * Updates the whole profile in one write.
 *
 * The original fired a separate un-awaited `findOneAndUpdate` per changed
 * field and then used `res.setTimeout(400, ...)` to guess when they had
 * finished, so a slow write was simply lost and a username change could half
 * apply. This validates everything first, then saves once.
 */
accountRouter.put('/', validate(profileSchema), async (req, res) => {
  const user = currentUser(req);
  const update = req.body as z.infer<typeof profileSchema>;

  const usernameChanged = update.username.toLowerCase() !== user.username.toLowerCase();
  const emailChanged = update.email !== user.email;

  if (usernameChanged) {
    if (findProfanity(update.username)) {
      throw HttpError.badRequest('Please choose a different username', [
        { field: 'username', message: 'That username contains language we do not allow' },
      ]);
    }
    if (await User.exists({ usernameLower: update.username.toLowerCase(), _id: { $ne: user._id } })) {
      throw HttpError.conflict(`The username "${update.username}" is already taken`);
    }
  }

  if (emailChanged && (await User.exists({ email: update.email, _id: { $ne: user._id } }))) {
    throw HttpError.conflict(`The email "${update.email}" is already registered`);
  }

  user.username = update.username;
  user.email = update.email;
  user.firstName = update.firstName;
  user.lastName = update.lastName;
  user.phone = update.phone;
  user.profileImage = update.profileImage;
  user.birthday = update.birthday ? new Date(`${update.birthday}T12:00:00Z`) : undefined;

  await user.save();

  // Posts and comments denormalise the username so boards render in one query.
  if (usernameChanged) {
    await Promise.all([
      Post.updateMany({ author: user._id }, { $set: { authorUsername: user.username } }),
      Post.updateMany(
        { 'comments.author': user._id },
        { $set: { 'comments.$[entry].authorUsername': user.username } },
        { arrayFilters: [{ 'entry.author': user._id }] },
      ),
    ]);
  }

  res.json({ user: toPublicUser(user), message: 'Your account has been updated' });
});

accountRouter.put(
  '/password',
  validate(
    z.object({
      currentPassword: z.string().min(1, 'Enter your current password'),
      newPassword: z
        .string()
        .min(10, 'Password must be at least 10 characters')
        .max(200, 'Password must be 200 characters or fewer'),
    }),
  ),
  async (req, res) => {
    const user = currentUser(req);
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    if (!(await verifyCurrentPassword(user, currentPassword))) {
      throw HttpError.badRequest('Your current password is not correct', [
        { field: 'currentPassword', message: 'Incorrect password' },
      ]);
    }

    user.passwordHash = await hashPassword(newPassword);
    user.legacySalt = undefined;
    user.legacyHash = undefined;
    await user.save();

    res.json({ message: 'Your password has been updated' });
  },
);

accountRouter.delete(
  '/',
  validate(z.object({ password: z.string().min(1, 'Enter your password to confirm') })),
  async (req, res, next) => {
    const user = currentUser(req);
    const { password } = req.body as { password: string };

    if (!(await verifyCurrentPassword(user, password))) {
      throw HttpError.badRequest('Your password is not correct', [
        { field: 'password', message: 'Incorrect password' },
      ]);
    }

    // Posts outlive the account so threads stay readable, but they are
    // reattributed rather than left pointing at a dangling user id.
    await Promise.all([
      Post.updateMany({ author: user._id }, { $set: { authorUsername: '[deleted]' } }),
      Post.updateMany(
        { 'comments.author': user._id },
        { $set: { 'comments.$[entry].authorUsername': '[deleted]' } },
        { arrayFilters: [{ 'entry.author': user._id }] },
      ),
      User.deleteOne({ _id: user._id }),
    ]);

    req.logout((error) => {
      if (error) return next(error);
      req.session.destroy((destroyError) => {
        if (destroyError) return next(destroyError);
        res.clearCookie(env.SESSION_COOKIE_NAME);
        res.json({ message: 'Your account has been deleted' });
      });
    });
  },
);
