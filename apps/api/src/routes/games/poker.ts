import { Router } from 'express';
import { z } from 'zod';
import {
  HAND_SIZE,
  MAX_BET,
  MIN_BET,
  deal,
  draw,
  evaluateHand,
  payout,
  type Card,
} from '@tabledojo/game-logic';
import { HttpError } from '../../lib/http-error.js';
import { creditCoins, debitCoins } from '../../lib/coins.js';
import { secureRng } from '../../lib/rng.js';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { GameSession } from '../../models/game-session.js';

export const pokerRouter = Router();

pokerRouter.use(requireAuth);

interface PokerState {
  hand: Card[];
  /** The undealt remainder. Never sent to the client. */
  stock: Card[];
  drawn: boolean;
}

/**
 * Deals the opening hand.
 *
 * The bet is debited here, and the 47 undealt cards stay on the server. The
 * original dealt in the browser with Math.random and told the server what the
 * balance should be afterwards.
 */
pokerRouter.post(
  '/deal',
  validate(z.object({ bet: z.coerce.number().int().min(MIN_BET).max(MAX_BET) })),
  async (req, res) => {
    const user = currentUser(req);
    const { bet } = req.body as { bet: number };

    // Only one hand in flight at a time, so a stale tab cannot resolve twice.
    await GameSession.deleteMany({ user: user._id, game: 'poker', status: 'active' });

    const coins = await debitCoins(user._id, bet);
    const { hand, stock } = deal(secureRng);

    const session = await GameSession.create({
      user: user._id,
      game: 'poker',
      bet,
      state: { hand, stock, drawn: false } satisfies PokerState,
    });

    res.status(201).json({
      sessionId: session._id.toString(),
      hand,
      bet,
      coins,
      // The dealt hand can already be a winner, but nothing pays until the draw.
      preview: evaluateHand(hand),
    });
  },
);

/** Replaces the cards the player did not hold and settles the hand. */
pokerRouter.post(
  '/draw',
  validate(
    z.object({
      sessionId: z.string().trim().min(1),
      holds: z.array(z.boolean()).length(HAND_SIZE, `Send exactly ${HAND_SIZE} hold flags`),
    }),
  ),
  async (req, res) => {
    const user = currentUser(req);
    const { sessionId, holds } = req.body as { sessionId: string; holds: boolean[] };

    const session = await GameSession.findOne({
      _id: sessionId,
      user: user._id,
      game: 'poker',
      status: 'active',
    });

    if (!session) throw HttpError.notFound('That hand has already been played or has expired');

    const state = session.state as PokerState;
    if (state.drawn) throw HttpError.badRequest('That hand has already been drawn');

    const finalHand = draw(state.hand, state.stock, holds);
    const result = evaluateHand(finalHand);
    const won = payout(result, session.bet);

    session.state = { ...state, hand: finalHand, drawn: true } satisfies PokerState;
    session.status = 'settled';
    await session.save();

    const coins = await creditCoins(user._id, won);

    res.json({ hand: finalHand, result, payout: won, bet: session.bet, coins });
  },
);
