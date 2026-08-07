import type { UserDocument } from '../models/user.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    /**
     * Passport's `req.user`. Deserialization loads the full Mongoose document,
     * so routes can read coins and update the user without a second query.
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends UserDocument {}
  }
}

export {};
