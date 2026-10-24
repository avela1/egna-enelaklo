import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { IS_PUBLIC_KEY } from './decorators';
import { parseCookies, SESSION_COOKIE } from '../http/cookies';
import type { AuthenticatedRequest } from './principal';

/**
 * Resolves the session cookie into a principal.
 *
 * Applied globally: every route needs a session unless it is marked
 * `@Public()`. A missing or invalid session is a 401.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];

    if (token) {
      const session = await this.sessions.resolve(token);

      if (session) {
        request.principal = session.principal;
        request.sessionId = session.session.id;
      }
    }

    if (isPublic) return true;

    if (!request.principal) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Sign in to continue',
      });
    }

    return true;
  }
}
