import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { AuditService } from '../audit/audit.service';
import { PERMISSION_KEY } from './decorators';
import type { AuthenticatedRequest } from './principal';

/**
 * Checks the permission keys of the signed in person.
 *
 * This is the security boundary: hiding a menu item in the web app is a
 * usability choice, this guard is the control.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = request.principal;

    if (!principal) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Sign in to continue',
      });
    }

    const missing = required.filter((permission) => !principal.permissions.includes(permission));

    if (missing.length > 0) {
      await this.audit.record({
        actorId: principal.id,
        actorRole: principal.role,
        action: 'access.denied',
        targetType: 'route',
        targetId: request.route?.path ?? request.path,
        after: { required, missing },
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        requestId: request.requestId,
      });

      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to do that',
        details: { missing },
      });
    }

    return true;
  }
}
