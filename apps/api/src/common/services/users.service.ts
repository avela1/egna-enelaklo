import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { Principal } from '../auth/principal';

/**
 * Loads a user with the role and the permissions that go with it.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Builds the principal of a signed in person. */
  async resolvePrincipal(userId: string, sessionId: string): Promise<Principal | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: { include: { permissions: true } } },
        },
      },
    });

    if (!user) return null;

    const assignment = user.roles.find((entry) => entry.isPrimary) ?? user.roles[0];
    const role = assignment?.roleName ?? 'CUSTOMER';
    const permissions = assignment?.role.permissions.map((entry) => entry.permissionKey) ?? [];

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      locale: user.locale,
      status: user.status,
      role,
      permissions,
      sessionId,
    };
  }
}
