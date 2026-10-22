import type { ExecutionContext } from '@nestjs/common';
import { env } from '../../config/env';

/**
 * The rate limit of a request, per IP and per minute.
 *
 * The sign in and registration routes get a strict limit, everything else a
 * general one. The limit is read per request, so it can be changed without
 * restarting the API.
 */
export function rateLimitFor(context: ExecutionContext): number {
  const request = context.switchToHttp().getRequest<{ originalUrl?: string }>();
  const url = request.originalUrl ?? '';

  if (url.includes('/auth')) {
    return Number(process.env['AUTH_RATE_LIMIT'] ?? env.AUTH_RATE_LIMIT);
  }

  return Number(process.env['RATE_LIMIT'] ?? env.RATE_LIMIT);
}

/** The window of the rate limit, in milliseconds. */
export const RATE_LIMIT_TTL = 60_000;
