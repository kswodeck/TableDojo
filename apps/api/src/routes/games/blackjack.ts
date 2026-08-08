import { Router } from 'express';
import { z } from 'zod';
import {
  BlackjackRuleError,
  MAX_BLACKJACK_BET,
  MIN_BLACKJACK_BET,
  act,
  availableActions,
  handValue,
  startRound,
  totalStaked,
  type BlackjackState,
} from '@tabledojo/game-logic';
import { HttpError } from '../../lib/http-error.js';
import { creditCoins, debitCoins } from '../../lib/coins.js';
import { secureRng } from '../../lib/rng.js';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { GameSession, type GameSessionDocument } from '../../models/game-session.js';

export const blackjackRouter = Router();

blackjackRouter.use(requireAuth);

/**
 * Competitive blackjack.
 *
 * Practice mode runs entirely in the browser against the same rules package,
 * so it costs nothing and needs no round trip. Only ranked play comes through
 * here, where the server owns the shoe and the coin movement.
 */

/**
 * Strips the shoe, and hides the dealer's hole card until the player's turn is
 * over — otherwise the whole round is readable from the network tab.
 */
function present(session: GameSessionDocument) {
  const state = session.state as BlackjackState;
  const concealDealer = state.status === 'player-turn';
  const dealer = concealDealer ? state.dealer.slice(0, 1) : state.dealer;

  return {
    sessionId: session._id.toString(),
    status: state.status,
    hands: state.hands.map((hand) => ({
      cards: hand.cards,
      bet: hand.bet,
      status: hand.status,
      doubled: hand.doubled,
      fromSplitAce: hand.fromSplitAce,
      value: handValue(hand.cards),
      ...(hand.outcome ? { outcome: hand.outcome, payout: hand.payout } : {}),
    })),
    activeHandIndex: state.activeHandIndex,
    dealer,
    dealerValue: concealDealer ? handValue(dealer) : handValue(state.dealer),
    dealerHoleCardHidden: concealDealer,
    availableActions: availableActions(state),
    totalPayout: state.status === 'settled' ? state.totalPayout : 0,
  };
}

async function loadRound(userId: GameSessionDocument['user'], sessionId: string): Promise<GameSessionDocument> {
  const session = await GameSession.findOne({ _id: sessionId, user: userId, game: 'blackjack', status: 'active' });
  if (!session) throw HttpError.notFound('That round has already finished or has expired');
  return session;
}

blackjackRouter.post(
  '/start',
  validate(z.object({ bet: z.coerce.number().int().min(MIN_BLACKJACK_BET).max(MAX_BLACKJACK_BET) })),
  async (req, res) => {
    const user = currentUser(req);
    const { bet } = req.body as { bet: number };

    await GameSession.deleteMany({ user: user._id, game: 'blackjack', status: 'active' });

    let coins = await debitCoins(user._id, bet);
    const state = startRound(bet, secureRng);

    const session = await GameSession.create({
      user: user._id,
      game: 'blackjack',
      bet,
      // A natural on the deal settles the round before the player acts.
      status: state.status === 'settled' ? 'settled' : 'active',
      state,
    });

    if (state.status === 'settled') {
      coins = await creditCoins(user._id, state.totalPayout, state.totalPayout - totalStaked(state));
    }

    res.status(201).json({ ...present(session), coins });
  },
);

blackjackRouter.post(
  '/action',
  validate(
    z.object({
      sessionId: z.string().trim().min(1),
      action: z.enum(['hit', 'stand', 'double', 'split']),
    }),
  ),
  async (req, res) => {
    const user = currentUser(req);
    const { sessionId, action } = req.body as { sessionId: string; action: 'hit' | 'stand' | 'double' | 'split' };
    const session = await loadRound(user._id, sessionId);

    const before = session.state as BlackjackState;
    if (!availableActions(before).includes(action)) {
      throw HttpError.badRequest(`You cannot ${action} right now`);
    }

    let after: BlackjackState;
    try {
      after = act(before, action);
    } catch (error) {
      throw error instanceof BlackjackRuleError ? HttpError.badRequest(error.message) : error;
    }

    // Doubling and splitting put more coins on the table, so the difference is
    // debited before the new state is committed. A player who cannot cover it
    // keeps the round exactly as it was.
    const additionalStake = totalStaked(after) - totalStaked(before);
    let coins = user.coins;
    if (additionalStake > 0) {
      coins = await debitCoins(user._id, additionalStake);
    }

    session.state = after;
    if (after.status === 'settled') session.status = 'settled';
    await session.save();

    if (after.status === 'settled') {
      // The payout returns the stake too, so the leaderboard's "highest win"
      // records the net profit rather than the gross amount handed back.
      coins = await creditCoins(user._id, after.totalPayout, after.totalPayout - totalStaked(after));
    }

    res.json({ ...present(session), coins });
  },
);
