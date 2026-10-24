import { BadRequestException, Injectable } from '@nestjs/common';
import type { UpdateProfileValues } from '@egna-enelaklo/shared';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PasswordService } from '../../common/services/password.service';
import type { Principal } from '../../common/auth/principal';
import type { RequestMeta } from '../../common/http/request-meta';

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly passwords: PasswordService,
  ) {}

  /** Updates the name, the phone number or the language of the signed in person. */
  async updateProfile(
    principal: Principal,
    values: UpdateProfileValues,
    meta: RequestMeta,
  ): Promise<void> {
    const before = await this.prisma.user.findUnique({
      where: { id: principal.id },
      select: { name: true, phone: true, locale: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: principal.id },
        data: {
          ...(values.name === undefined ? {} : { name: values.name }),
          ...(values.phone === undefined
            ? {}
            : { phone: values.phone === '' ? null : values.phone }),
          ...(values.locale === undefined ? {} : { locale: values.locale }),
        },
      });

      await this.audit.record(
        {
          actorId: principal.id,
          actorRole: principal.role,
          action: 'user.profile_updated',
          targetType: 'user',
          targetId: principal.id,
          before: before ?? undefined,
          after: {
            ...(values.name === undefined ? {} : { name: values.name }),
            ...(values.phone === undefined ? {} : { phone: values.phone }),
            ...(values.locale === undefined ? {} : { locale: values.locale }),
          },
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );
    });
  }

  /**
   * Changes the password of the signed in person. Every other session of
   * that person is revoked.
   */
  async changePassword(
    principal: Principal,
    currentPassword: string,
    newPassword: string,
    meta: RequestMeta,
  ): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: principal.id } });
    if (!user) {
      throw new BadRequestException({ code: 'USER_NOT_FOUND', message: 'Account not found' });
    }

    const matches = await this.passwords.verify(user.passwordHash, currentPassword);
    if (!matches) {
      throw new BadRequestException({
        code: 'WRONG_PASSWORD',
        message: 'Your current password is not correct',
      });
    }

    const passwordHash = await this.passwords.hash(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: principal.id },
        data: { passwordHash },
      });

      await this.audit.record(
        {
          actorId: principal.id,
          actorRole: principal.role,
          action: 'auth.password_changed',
          targetType: 'user',
          targetId: principal.id,
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );
    });

    // Keep the current session, revoke the rest.
    const result = await this.prisma.session.updateMany({
      where: { userId: principal.id, revokedAt: null, id: { not: principal.sessionId } },
      data: { revokedAt: new Date() },
    });

    return result.count;
  }
}
