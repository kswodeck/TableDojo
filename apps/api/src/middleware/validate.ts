import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { HttpError } from '../lib/http-error.js';

type Source = 'body' | 'query' | 'params';

/**
 * Parses and replaces a request segment with its validated, typed value.
 * Every route that reads user input goes through one of these, which is what
 * the old handlers skipped when they passed `req.body` straight into a Mongo
 * update.
 */
export function validate<T>(schema: ZodType<T>, source: Source = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(HttpError.badRequest('Some of the details you entered are not valid', details));
    }

    // Express 5 makes req.query a getter, so it is stashed rather than assigned.
    if (source === 'query') {
      Object.defineProperty(req, 'validatedQuery', { value: result.data, writable: true, configurable: true });
    } else {
      req[source] = result.data as never;
    }

    next();
  };
}

/** Reads the value stored by `validate(schema, 'query')`. */
export function validatedQuery<T>(req: Request): T {
  return (req as Request & { validatedQuery: T }).validatedQuery;
}

/**
 * Express 5 types route params as `string | string[] | undefined` because a
 * pattern can repeat. Every param this API declares is a single segment, so
 * this narrows to a string and rejects anything else outright.
 */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw HttpError.badRequest(`Missing "${name}" in the request path`);
  }
  return value;
}
