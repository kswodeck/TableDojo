/**
 * Typed client for the Express API.
 *
 * Every call sends the session cookie, and every failure arrives as an
 * `ApiError` carrying the field-level details the server produced — so forms
 * can attach messages to inputs instead of showing one generic banner.
 */
const BASE_URL =
  (typeof window === 'undefined' ? process.env.API_INTERNAL_URL : process.env.NEXT_PUBLIC_API_URL) ??
  'http://localhost:5000';

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: FieldError[];

  constructor(status: number, code: string, message: string, details: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Field name to message, for wiring straight into a form. */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries(this.details.map((detail) => [detail.field, detail.message]));
  }

  /**
   * True when the request never reached the API — a timeout, a suspended
   * free-tier instance, or no network. Callers use this to fail soft rather
   * than surfacing a server error the visitor cannot act on.
   */
  get isUnreachable(): boolean {
    return this.status === 0;
  }
}

const isServer = typeof window === 'undefined';

/**
 * Request timeouts, sized for a free-tier API that suspends when idle.
 *
 * In the browser a cold start is worth waiting out — the alternative is an
 * error the user cannot act on — so the budget is generous and the UI says
 * what is happening. During SSR the budget is tight, because the render is
 * itself running inside a serverless function with its own hard limit; a page
 * that fails soft beats one that dies with the function.
 */
export const COLD_START_TIMEOUT_MS = 70_000;
export const SSR_TIMEOUT_MS = 6_000;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Forwarded during SSR so the server sees the caller's session. */
  cookie?: string;
  cache?: RequestCache;
  /** Overrides the default budget for this call. */
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    cookie,
    cache = 'no-store',
    timeoutMs = isServer ? SSR_TIMEOUT_MS : COLD_START_TIMEOUT_MS,
  } = options;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      cache,
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError(
        0,
        'timeout',
        'The server is taking too long to respond. It may be waking up — try again in a moment.',
      );
    }
    throw new ApiError(0, 'network_error', 'Could not reach the server. Check your connection and try again.');
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string; details?: FieldError[] } } | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'server_error',
      error?.message ?? 'Something went wrong. Please try again.',
      error?.details ?? [],
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE', body }),
};
