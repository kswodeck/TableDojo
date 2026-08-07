import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { isProduction } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: 'not_found', message: `No route matches ${req.method} ${req.originalUrl}` },
  });
};

/**
 * Single JSON error shape for every failure: `{ error: { code, message, details? } }`.
 * The old app rendered a 500 page with the raw error object interpolated into
 * the markup, which leaked stack traces and Mongo internals to visitors.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      error: {
        code: 'bad_request',
        message: 'Some of the details you entered are not valid',
        details: Object.entries(error.errors).map(([field, issue]) => ({ field, message: issue.message })),
      },
    });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: { code: 'bad_request', message: 'That identifier is not valid' } });
    return;
  }

  if (isDuplicateKeyError(error)) {
    res.status(409).json({ error: { code: 'conflict', message: 'That value is already taken' } });
    return;
  }

  console.error('[error]', error);
  res.status(500).json({
    error: {
      code: 'server_error',
      message: isProduction ? 'Something went wrong on our end' : String((error as Error)?.message ?? error),
    },
  });
};

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}
