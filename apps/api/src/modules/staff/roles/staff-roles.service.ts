import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PERMISSION_DESCRIPTIONS,
  PERMISSION_KEYS,
  type PermissionKey,
  type RolePermissionsValues,
} from '@egna-enelaklo/shared';
import type { AuditService } from '../../../common/audit/audit.service';
import type { PrismaService } from '../../../common/prisma/prisma.service';
import type { Principal } from '../../../common/auth/principal';
import type { RequestMeta } from '../../../common/http/request-meta';

@Injectable()
export class StaffRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Every role with the permission keys it has. */
  async list() {
    const roles = await this.prisma.role.findMany({
      include: { permissions: true },
      orderBy: { name: 'asc' },
    });

    return {
      items: roles.map((role) => ({
        name: role.name,
        description: role.description,
        permissions: role.permissions.map((entry) => entry.permissionKey).sort(),
        locked: role.name === 'ADMIN',
      })),
      permissions: PERMISSION_KEYS.map((key) => ({
        key,
        description: PERMISSION_DESCRIPTIONS[key],
      })),
    };
  }

  /**
   * Replaces the permissions of a role. The ADMIN role always keeps every
   * permission and cannot be edited.
   */
  async updatePermissions(
    roleName: string,
    values: RolePermissionsValues,
    principal: Principal,
    meta: RequestMeta,
  ) {
    if (roleName === 'ADMIN') {
      throw new BadRequestException({
        code: 'ROLE_LOCKED',
        message: 'The admin role always keeps every permission',
      });
    }

    const role = await this.prisma.role.findUnique({
      where: { name: roleName as never },
      include: { permissions: true },
    });

    if (!role) {
      throw new BadRequestException({ code: 'NOT_FOUND', message: 'Role not found' });
    }

    const before = role.permissions.map((entry) => entry.permissionKey).sort();
    const after = [...new Set(values.permissions)].sort() as PermissionKey[];

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleName: role.name } });

      if (after.length > 0) {
        await tx.rolePermission.createMany({
          data: after.map((permissionKey) => ({ roleName: role.name, permissionKey })),
        });
      }

      await this.audit.record(
        {
          actorId: principal.id,
          actorRole: principal.role,
          action: 'role.permissions_changed',
          targetType: 'role',
          targetId: role.name,
          before: { permissions: before },
          after: { permissions: after },
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );
    });

    return { name: role.name, permissions: after };
  }
}
