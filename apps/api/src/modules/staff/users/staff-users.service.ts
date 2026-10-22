import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, RoleName, UserStatus } from '@prisma/client';
import type { InviteUserValues, StaffUserQuery } from '@egna-enelaklo/shared';
import type { AuditService } from '../../../common/audit/audit.service';
import type { MailService } from '../../../common/mail/mail.service';
import type { PrismaService } from '../../../common/prisma/prisma.service';
import type { SessionService } from '../../../common/services/session.service';
import { hashToken } from '../../../common/services/session.service';
import type { Principal } from '../../../common/auth/principal';
import type { RequestMeta } from '../../../common/http/request-meta';
import { env } from '../../../config/env';

@Injectable()
export class StaffUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly sessions: SessionService,
  ) {}

  /** The staff user list, with a search, a role filter and a status filter. */
  async list(query: StaffUserQuery) {
    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) where.status = query.status as UserStatus;
    if (query.role) where.roles = { some: { roleName: query.role as RoleName } };

    const skip = (query.page - 1) * query.pageSize;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: { roles: true },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        locale: user.locale,
        status: user.status,
        role: user.roles.find((entry) => entry.isPrimary)?.roleName ?? 'CUSTOMER',
        emailVerified: user.emailVerifiedAt !== null,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  /**
   * Invites a staff user. The account starts as INVITED and cannot sign in
   * until the invite link sets the password.
   */
  async invite(values: InviteUserValues, principal: Principal, meta: RequestMeta) {
    const existing = await this.prisma.user.findUnique({ where: { email: values.email } });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_TAKEN',
        message: 'An account with this email already exists',
      });
    }

    const token = randomBytes(32).toString('base64url');
    const passwordHash = `invited:${randomBytes(16).toString('hex')}`;

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: values.email,
          name: values.name,
          passwordHash,
          status: 'INVITED',
          roles: { create: { roleName: values.role, isPrimary: true } },
          emailTokens: {
            create: {
              type: 'INVITE',
              tokenHash: hashToken(token),
              expiresAt: new Date(Date.now() + env.INVITE_TOKEN_MINUTES * 60 * 1000),
            },
          },
        },
      });

      await this.audit.record(
        {
          actorId: principal.id,
          actorRole: principal.role,
          action: 'user.invited',
          targetType: 'user',
          targetId: created.id,
          after: { email: created.email, name: created.name, role: values.role },
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );

      return created;
    });

    await this.mail.sendStaffInvite(
      user.email,
      user.name,
      values.role,
      `${env.WEB_URL}/set-password?token=${token}`,
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: values.role,
      status: user.status,
    };
  }

  /** Changes the role of a staff user. */
  async changeRole(userId: string, role: RoleName, principal: Principal, meta: RequestMeta) {
    const target = await this.findUser(userId);

    if (target.id === principal.id && role !== 'ADMIN') {
      throw new BadRequestException({
        code: 'CANNOT_DEMOTE_SELF',
        message: 'You cannot remove your own admin role',
      });
    }

    const currentRole = target.roles.find((entry) => entry.isPrimary)?.roleName ?? 'CUSTOMER';

    if (currentRole === 'ADMIN' && role !== 'ADMIN') {
      await this.assertNotLastAdmin(target.id, 'demote');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: target.id } });
      await tx.userRole.create({ data: { userId: target.id, roleName: role, isPrimary: true } });

      await this.audit.record(
        {
          actorId: principal.id,
          actorRole: principal.role,
          action: 'user.role_changed',
          targetType: 'user',
          targetId: target.id,
          before: { role: currentRole },
          after: { role },
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );
    });

    return { id: target.id, role };
  }

  /** Disables an account and signs it out everywhere. */
  async disable(userId: string, principal: Principal, meta: RequestMeta) {
    const target = await this.findUser(userId);

    if (target.id === principal.id) {
      throw new BadRequestException({
        code: 'CANNOT_DISABLE_SELF',
        message: 'You cannot disable your own account',
      });
    }

    if (target.roles.some((entry) => entry.roleName === 'ADMIN')) {
      await this.assertNotLastAdmin(target.id, 'disable');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: target.id }, data: { status: 'DISABLED' } });

      await this.audit.record(
        {
          actorId: principal.id,
          actorRole: principal.role,
          action: 'user.disabled',
          targetType: 'user',
          targetId: target.id,
          before: { status: target.status },
          after: { status: 'DISABLED' },
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );
    });

    await this.sessions.revokeAllForUser(target.id);

    return { id: target.id, status: 'DISABLED' as const };
  }

  /** Enables an account again. */
  async enable(userId: string, principal: Principal, meta: RequestMeta) {
    const target = await this.findUser(userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: target.id }, data: { status: 'ACTIVE' } });

      await this.audit.record(
        {
          actorId: principal.id,
          actorRole: principal.role,
          action: 'user.enabled',
          targetType: 'user',
          targetId: target.id,
          before: { status: target.status },
          after: { status: 'ACTIVE' },
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );
    });

    return { id: target.id, status: 'ACTIVE' as const };
  }

  private async findUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
    }

    return user;
  }

  /** The last active admin can never be disabled or demoted. */
  private async assertNotLastAdmin(userId: string, action: 'disable' | 'demote'): Promise<void> {
    const otherAdmins = await this.prisma.user.count({
      where: {
        id: { not: userId },
        status: 'ACTIVE',
        roles: { some: { roleName: 'ADMIN' } },
      },
    });

    if (otherAdmins === 0) {
      throw new BadRequestException({
        code: 'LAST_ADMIN',
        message: `The last active admin can never be ${action}d`,
      });
    }
  }
}
