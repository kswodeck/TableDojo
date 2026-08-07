import { Schema, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

export const AVATARS = ['smiley', 'smiley-money', 'smiley-neutral', 'male-avatar', 'female-avatar'] as const;
export type Avatar = (typeof AVATARS)[number];

export const STARTING_COINS = 100;
export const DAILY_LOGIN_BONUS = 10;

const userSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 60 },
    username: { type: String, required: true, trim: true, minlength: 5, maxlength: 25 },
    /** Lowercased username, used for the unique index and case-insensitive lookup. */
    usernameLower: { type: String, required: true },

    passwordHash: { type: String, required: false, select: false },
    /** Legacy passport-local-mongoose fields, upgraded to scrypt on next login. */
    legacySalt: { type: String, select: false },
    legacyHash: { type: String, select: false },

    firstName: { type: String, trim: true, maxlength: 40, default: '' },
    lastName: { type: String, trim: true, maxlength: 50, default: '' },
    birthday: { type: Date },
    /**
     * Optional profile detail. It used to be a credential: the account
     * recovery routes matched on email + phone + birthday. Recovery is now
     * token-and-email based, so this is no longer security-relevant.
     */
    phone: { type: String, trim: true, maxlength: 16, default: '' },

    coins: { type: Number, default: STARTING_COINS, min: 0 },
    highestWin: { type: Number, default: 0, min: 0 },
    loginStreak: { type: Number, default: 1, min: 0 },
    lastLoginAt: { type: Date, default: () => new Date() },

    profileImage: { type: String, enum: AVATARS, default: 'smiley' },

    /** Only ever holds a SHA-256 digest of a single-use reset token. */
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.legacySalt;
        delete ret.legacyHash;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpiresAt;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// The leaderboard sorts by coins and the old code did it in memory over every
// user in the collection. These indexes make it a paged, index-backed query.
userSchema.index({ coins: -1, _id: 1 });
userSchema.index({ usernameLower: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

userSchema.pre('validate', function setUsernameLower(next) {
  if (this.username) this.usernameLower = this.username.toLowerCase();
  next();
});

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserAttrs>;

export const User: Model<UserAttrs> = model<UserAttrs>('User', userSchema);

/** The shape sent to the browser for the signed-in user. */
export interface PublicUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  birthday: string | null;
  phone: string;
  coins: number;
  highestWin: number;
  loginStreak: number;
  profileImage: string;
  createdAt: string;
}

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : null,
    phone: user.phone ?? '',
    coins: user.coins,
    highestWin: user.highestWin,
    loginStreak: user.loginStreak,
    profileImage: user.profileImage,
    createdAt: (user.get('createdAt') as Date | undefined)?.toISOString() ?? new Date(0).toISOString(),
  };
}
