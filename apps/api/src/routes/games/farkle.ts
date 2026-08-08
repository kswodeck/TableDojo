import { Router } from 'express';
import { z } from 'zod';
import {
  COMPETITIVE_BET_STEP,
  FarkleRuleError,
  MAX_COMPETITIVE_BET,
  MIN_COMPETITIVE_BET,
  bank,
  betTier,
  keep,
  roll,
  startTurn,
  type TurnState,
} from '@tabledojo/game-logic';
import { HttpError } from '../../lib/http-error.js';
import { creditCoins, debitCoins } from '../../lib/coins.js';
import { secureRng } from '../../lib/rng.js';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { GameSession, type GameSessionDocument } from '../../models/game-session.js';

export const farkleRouter = Router();

farkleRouter.use(requireAuth);

const sessionIdSchema = z.object({ sessionId: z.string().trim().min(1) });

/** The client never needs the multiplier or internal status names. */
function present(session: GameSessionDocument) {
  const state = session.state as TurnState;
  return {
    sessionId: session._id.toString(),
    bet: session.bet,
    diceAvailable: state.diceAvailable,
    rolled: state.rolled,
    category: state.category,
    pendingPoints: state.pendingPoints,
    keeps: state.keeps,
    status: state.status,
    hotDice: state.hotDice,
  };
}

async function loadTurn(userId: GameSessionDocument['user'], sessionId: string): Promise<GameSessionDocument> {
  const session = await GameSession.findOne({
    _id: sessionId,
    user: userId,
    game: 'farkle',
    status: 'active',
  });

  if (!session) throw HttpError.notFound('That turn has already finished or has expired');
  return session;
}

/**
 * Rule violations from the engine are the player's fault, not the server's, so
 * they surface as 400s rather than falling through to the 500 handler.
 */
function asHttpError(error: unknown): unknown {
  return error instanceof FarkleRuleError ? HttpError.badRequest(error.message) : error;
}

farkleRouter.post(
  '/start',
  validate(
    z.object({
      bet: z.coerce
        .number()
        .int()
        .min(MIN_COMPETITIVE_BET)
        .max(MAX_COMPETITIVE_BET)
        .refine((value) => value % COMPETITIVE_BET_STEP === 0, {
          message: `Bets go up in steps of ${COMPETITIVE_BET_STEP} coins`,
        }),
    }),
  ),
  async (req, res) => {
    const user = currentUser(req);
    const { bet } = req.body as { bet: number };

    await GameSession.deleteMany({ user: user._id, game: 'farkle', status: 'active' });

    const coins = await debitCoins(user._id, bet);
    const session = await GameSession.create({
      user: user._id,
      game: 'farkle',
      bet,
      state: startTurn(betTier(bet)),
    });

    res.status(201).json({ ...present(session), coins });
  },
);

farkleRouter.post('/roll', validate(sessionIdSchema), async (req, res) => {
  const user = currentUser(req);
  const { sessionId } = req.body as { sessionId: string };
  const session = await loadTurn(user._id, sessionId);

  let next: TurnState;
  try {
    next = roll(session.state as TurnState, secureRng);
  } catch (error) {
    throw asHttpError(error);
  }

  session.state = next;

  // A farkle wipes the turn — the wager is already spent, so the turn just ends.
  if (next.status === 'farkled') {
    session.status = 'settled';
  }
  await session.save();

  res.json({ ...present(session), coins: user.coins });
});

farkleRouter.post(
  '/keep',
  validate(sessionIdSchema.extend({ indices: z.array(z.coerce.number().int().min(0).max(5)).min(1).max(6) })),
  async (req, res) => {
    const user = currentUser(req);
    const { sessionId, indices } = req.body as { sessionId: string; indices: number[] };
    const session = await loadTurn(user._id, sessionId);

    let next: TurnState;
    try {
      next = keep(session.state as TurnState, indices);
    } catch (error) {
      throw asHttpError(error);
    }

    session.state = next;
    await session.save();

    res.json({ ...present(session), coins: user.coins });
  },
);

farkleRouter.post('/bank', validate(sessionIdSchema), async (req, res) => {
  const user = currentUser(req);
  const { sessionId } = req.body as { sessionId: string };
  const session = await loadTurn(user._id, sessionId);

  let next: TurnState;
  try {
    next = bank(session.state as TurnState);
  } catch (error) {
    throw asHttpError(error);
  }

  // Settle the session before paying out, so a duplicate request cannot be
  // banked twice: the second one no longer finds an active turn.
  session.state = next;
  session.status = 'settled';
  await session.save();

  const coins = await creditCoins(user._id, next.pendingPoints);

  res.json({ ...present(session), payout: next.pendingPoints, coins });
});
