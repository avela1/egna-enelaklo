import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { CSRF_COOKIE, CSRF_HEADER, parseCookies } from '../http/cookies';
import type { AuthenticatedRequest } from '../auth/principal';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Requires a matching CSRF token on every state changing request, including
 * sign in and registration.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const cookieToken = parseCookies(request.headers.cookie)[CSRF_COOKIE];
    const headerValue = request.headers[CSRF_HEADER];
    const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException({
        code: 'CSRF_FAILED',
        message: 'Invalid or missing CSRF token',
      });
    }

    return true;
  }
}
