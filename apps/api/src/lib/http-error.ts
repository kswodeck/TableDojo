/**
 * Errors thrown anywhere in a route bubble to the central error handler.
 * Express 5 forwards rejected promises automatically, so route handlers can be
 * plain `async` functions with no wrapper.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, message: string, options: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = options.code ?? defaultCode(status);
    this.details = options.details;
  }

  static badRequest(message: string, details?: unknown) {
    return new HttpError(400, message, { details });
  }
  static unauthorized(message = 'You must be logged in to do that') {
    return new HttpError(401, message);
  }
  static forbidden(message = 'You do not have permission to do that') {
    return new HttpError(403, message);
  }
  static notFound(message = 'Not found') {
    return new HttpError(404, message);
  }
  static conflict(message: string) {
    return new HttpError(409, message);
  }
  static tooManyRequests(message = 'Too many requests, please slow down') {
    return new HttpError(429, message);
  }
}

function defaultCode(status: number): string {
  const codes: Record<number, string> = {
    400: 'bad_request',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'not_found',
    409: 'conflict',
    422: 'unprocessable',
    429: 'rate_limited',
  };
  return codes[status] ?? 'server_error';
}
