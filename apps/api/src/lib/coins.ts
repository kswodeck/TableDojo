import { HttpError } from './http-error.js';
import { User } from '../models/user.js';
import type { Types } from 'mongoose';

/**
 * All coin movement goes through these two helpers.
 *
 * Both are single atomic updates. The old flow had the browser compute the new
 * balance and PUT it back — the server wrote whatever number it was given, and
 * two games open in two tabs would clobber each other's balance.
 */

/** Debits a wager, refusing the bet if the balance would go negative. */
export async function debitCoins(userId: Types.ObjectId, amount: number): Promise<number> {
  if (amount <= 0) throw HttpError.badRequest('A wager must be greater than zero');

  const updated = await User.findOneAndUpdate(
    { _id: userId, coins: { $gte: amount } },
    { $inc: { coins: -amount } },
    { new: true, projection: { coins: 1 } },
  );

  if (!updated) {
    throw new HttpError(400, 'You do not have enough coins for that bet', { code: 'insufficient_coins' });
  }

  return updated.coins;
}

/**
 * Credits winnings and advances the player's best-ever win in one write.
 *
 * `netWin` defaults to the credited amount, which is right for games where the
 * stake is not handed back (poker, farkle). Blackjack returns the stake inside
 * the payout, so it passes the profit separately and a push does not register
 * as a record win.
 */
export async function creditCoins(
  userId: Types.ObjectId,
  amount: number,
  netWin: number = amount,
): Promise<number> {
  if (amount < 0) throw HttpError.badRequest('A payout cannot be negative');

  const update: Record<string, unknown> = {};
  if (amount > 0) update.$inc = { coins: amount };
  if (netWin > 0) update.$max = { highestWin: netWin };

  const updated = await User.findByIdAndUpdate(userId, update, { new: true, projection: { coins: 1 } });

  if (!updated) throw HttpError.notFound('Account not found');
  return updated.coins;
}
