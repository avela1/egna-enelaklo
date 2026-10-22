import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { PermissionKey } from '@egna-enelaklo/shared';
import type { AuthenticatedRequest, Principal } from './principal';

export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSION_KEY = 'permission';
export const ROLES_KEY = 'roles';

/** Marks a route as open: no session is required. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

/** Requires every listed permission key. */
export const RequirePermission = (
  ...permissions: PermissionKey[]
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSION_KEY, permissions);

/** Requires one of the listed roles. Prefer permission keys over roles. */
export const Roles = (...roles: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);

/** Injects the signed in principal into a handler argument. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Principal | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.principal;
  },
);
