import { Schema, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

/**
 * Server-side state for an in-progress competitive game.
 *
 * The original design let the browser compute its own winnings and PUT a new
 * coin balance back to the server, which meant anyone could set their balance
 * from the console. Here the server deals the cards, rolls the dice, scores the
 * result and moves the coins; the client only ever sends its decisions.
 *
 * Sessions expire on their own so abandoned games do not accumulate.
 */
export const GAME_SESSION_TTL_SECONDS = 60 * 60 * 6;

const gameSessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    game: { type: String, required: true, enum: ['poker', 'blackjack', 'farkle'] },
    status: { type: String, required: true, enum: ['active', 'settled'], default: 'active' },
    bet: { type: Number, required: true, min: 0 },
    /** Game-specific state; shape is owned by the route that created it. */
    state: { type: Schema.Types.Mixed, required: true },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + GAME_SESSION_TTL_SECONDS * 1000),
    },
  },
  { timestamps: true, minimize: false },
);

gameSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type GameSessionAttrs = InferSchemaType<typeof gameSessionSchema>;
export type GameSessionDocument = HydratedDocument<GameSessionAttrs>;

export const GameSession: Model<GameSessionAttrs> = model<GameSessionAttrs>('GameSession', gameSessionSchema);
