import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http-error.js';
import type { UserDocument } from '../models/user.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (req.isAuthenticated?.() && req.user) return next();
  next(HttpError.unauthorized());
}

export function requireGuest(req: Request, _res: Response, next: NextFunction): void {
  if (req.isAuthenticated?.() && req.user) {
    return next(HttpError.forbidden('You are already signed in'));
  }
  next();
}

/**
 * Narrows `req.user` for routes mounted behind `requireAuth`. Throwing here
 * rather than asserting keeps the 401 path honest if the guard is ever
 * removed by mistake.
 */
export function currentUser(req: Request): UserDocument {
  if (!req.user) throw HttpError.unauthorized();
  return req.user;
}
