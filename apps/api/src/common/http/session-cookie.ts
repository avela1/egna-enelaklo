import type { Response } from 'express';
import { isProduction } from '../../config/env';
import { SESSION_COOKIE } from './cookies';

/**
 * Writes the session cookie: httpOnly, SameSite=Lax and Secure in
 * production. The token is never readable by JavaScript.
 */
export function setSessionCookie(response: Response, token: string, expiresAt: Date): void {
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    expires: expiresAt,
  });
}

/** Removes the session cookie. */
export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
  });
}
