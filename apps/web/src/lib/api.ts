/**
 * The typed HTTP client for the egna-enelaklo API.
 *
 * - sends the session cookie (`credentials: 'include'`)
 * - attaches the CSRF token to every state changing request
 * - never stores a token in localStorage
 */

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export const CSRF_COOKIE = 'egna_csrf';
export const CSRF_HEADER = 'X-CSRF-Token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export class ApiError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly requestId: string | undefined;
  readonly status: number;

  constructor(init: {
    code: string;
    details?: unknown;
    message: string;
    requestId?: string;
    status: number;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
    this.requestId = init.requestId;
  }
}

/** True when the error means "you are not signed in". */
export function isUnauthorized(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}

/** True when the error means "you are not allowed to do that". */
export function isForbidden(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 403;
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/** The app registers a handler that sends the person to the sign in page. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

/** Reads a cookie that is not httpOnly, for example the CSRF token. */
export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  for (const part of document.cookie.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;

    const key = part.slice(0, separator).trim();
    if (key === name) return decodeURIComponent(part.slice(separator + 1).trim());
  }

  return null;
}

/**
 * Returns the CSRF token. The token lives in a readable cookie; the server
 * hands one out on `GET /auth/csrf` when there is none yet.
 */
async function csrfToken(): Promise<string> {
  const existing = readCookie(CSRF_COOKIE);
  if (existing) return existing;

  await fetch(`${API_BASE_URL}/auth/csrf`, { credentials: 'include' });

  return readCookie(CSRF_COOKIE) ?? '';
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Set to false for a request that must not trigger the session expired screen. */
  handleUnauthorized?: boolean;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, handleUnauthorized = true, headers, ...rest } = options;
  const method = (rest.method ?? 'GET').toUpperCase();

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...((headers as Record<string, string>) ?? {}),
  };

  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';

  if (!SAFE_METHODS.has(method)) {
    requestHeaders[CSRF_HEADER] = await csrfToken();
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    method,
    credentials: 'include',
    headers: requestHeaders,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const text = await response.text();
  const payload: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = payload as {
      code?: string;
      details?: unknown;
      message?: string;
      requestId?: string;
    } | null;

    const apiError = new ApiError({
      status: response.status,
      code: error?.code ?? 'UNKNOWN_ERROR',
      message: error?.message ?? response.statusText,
      details: error?.details,
      requestId: error?.requestId,
    });

    if (handleUnauthorized && apiError.status === 401) {
      unauthorizedHandler?.();
    }

    throw apiError;
  }

  return payload as T;
}
