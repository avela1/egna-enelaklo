import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { EmailTokenType } from '@prisma/client';
import {
  LocaleSchema,
  type Locale,
  type LoginValues,
  type RegisterValues,
  type ResetPasswordInput,
} from '@egna-enelaklo/shared';
import { env } from '../../config/env';
import type { AuditService } from '../../common/audit/audit.service';
import type { MailService } from '../../common/mail/mail.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { PasswordService } from '../../common/services/password.service';
import type { SessionService } from '../../common/services/session.service';
import { hashToken } from '../../common/services/session.service';
import type { Principal } from '../../common/auth/principal';
import type { RequestMeta } from '../../common/http/request-meta';

/** The same message for every failed sign in, so nothing leaks about the account. */
export const GENERIC_LOGIN_ERROR = 'Invalid email or password';

/** A hash of a random value, used to keep the timing of a failed sign in even. */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$J3r1Z1cQb0kQb0kQb0kQb0kQ$0000000000000000000000000000000000000000000';

/** The primary role of a user with its roles loaded, for the audit rows. */
function primaryRole(user: { roles: { isPrimary: boolean; roleName: string }[] }): string {
  return (
    user.roles.find((entry) => entry.isPrimary)?.roleName ?? user.roles[0]?.roleName ?? 'CUSTOMER'
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
  ) {}

  /** Creates a customer account, sends the verification email and starts a session. */
  async register(
    values: RegisterValues,
    meta: RequestMeta,
  ): Promise<{ user: Awaited<ReturnType<AuthService['publicUser']>>; token: string }> {
    const email = values.email.toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_TAKEN',
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await this.passwords.hash(values.password);
    const locale = LocaleSchema.parse(values.locale);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name: values.name,
          phone: values.phone === '' ? null : values.phone,
          passwordHash,
          locale,
          status: 'ACTIVE',
          roles: { create: { roleName: 'CUSTOMER', isPrimary: true } },
        },
      });

      await this.audit.record(
        {
          actorId: created.id,
          actorRole: 'CUSTOMER',
          action: 'user.registered',
          targetType: 'user',
          targetId: created.id,
          after: { email: created.email, name: created.name, role: 'CUSTOMER' },
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );

      return created;
    });

    const token = await this.createEmailToken(
      user.id,
      'VERIFY_EMAIL',
      env.VERIFY_EMAIL_TOKEN_MINUTES,
    );
    await this.mail.sendVerifyEmail(
      user.email,
      user.name,
      `${env.WEB_URL}/verify-email?token=${token}`,
    );

    const session = await this.sessions.create(user.id, meta);

    return { user: await this.publicUser(user.id), token: session.token };
  }

  /** Signs a person in. The message is the same for every failure. */
  async login(
    values: LoginValues,
    meta: RequestMeta,
    currentSessionId?: string,
  ): Promise<{ user: Awaited<ReturnType<AuthService['publicUser']>>; token: string }> {
    const email = values.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    if (!user) {
      await this.passwords.verify(DUMMY_HASH, values.password);
      await this.audit.record({
        actorId: null,
        actorRole: 'UNKNOWN',
        action: 'auth.login_failed',
        targetType: 'user',
        targetId: email,
        after: { reason: 'unknown_email' },
        ip: meta.ip,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });

      throw this.loginError();
    }

    const now = new Date();

    if (user.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
      await this.audit.record({
        actorId: user.id,
        actorRole: primaryRole(user),
        action: 'auth.locked',
        targetType: 'user',
        targetId: user.id,
        after: { lockedUntil: user.lockedUntil.toISOString() },
        ip: meta.ip,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });

      throw this.loginError(user.lockedUntil);
    }

    const passwordMatches = await this.passwords.verify(user.passwordHash, values.password);

    if (!passwordMatches || user.status !== 'ACTIVE') {
      // After an expired lock the counter starts a fresh cycle with this
      // failure, instead of giving one uncounted attempt.
      const lockExpired = user.lockedUntil !== null;
      const failedLoginCount = lockExpired ? 1 : user.failedLoginCount + 1;
      const shouldLock = failedLoginCount >= env.LOGIN_MAX_ATTEMPTS;
      const lockedUntil = shouldLock
        ? new Date(now.getTime() + env.LOGIN_LOCK_MINUTES * 60 * 1000)
        : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount, lockedUntil },
      });

      await this.audit.record({
        actorId: user.id,
        actorRole: primaryRole(user),
        action: shouldLock ? 'auth.locked' : 'auth.login_failed',
        targetType: 'user',
        targetId: user.id,
        after: {
          reason: user.status !== 'ACTIVE' ? `status_${user.status}` : 'wrong_password',
          failedLoginCount,
          ...(lockedUntil ? { lockedUntil: lockedUntil.toISOString() } : {}),
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });

      if (shouldLock) throw this.loginError(lockedUntil);

      throw this.loginError();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
    });

    await this.audit.record({
      actorId: user.id,
      actorRole: primaryRole(user),
      action: 'auth.login_success',
      targetType: 'user',
      targetId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    // A new session on every sign in, so a stolen cookie is worthless.
    if (currentSessionId) await this.sessions.revoke(currentSessionId);

    const session = await this.sessions.create(user.id, meta);

    return { user: await this.publicUser(user.id), token: session.token };
  }

  async logout(principal: Principal): Promise<void> {
    await this.sessions.revoke(principal.sessionId);
  }

  /** Signs the person out everywhere and records it. */
  async logoutAll(principal: Principal, meta: RequestMeta): Promise<number> {
    const revoked = await this.sessions.revokeAllForUser(principal.id);

    await this.audit.record({
      actorId: principal.id,
      actorRole: principal.role,
      action: 'auth.logout_all',
      targetType: 'user',
      targetId: principal.id,
      after: { revokedSessions: revoked },
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return revoked;
  }

  /**
   * Always answers the same way, whether or not the email exists. When it
   * does, a single use reset link is emailed.
   */
  async forgot(emailInput: string): Promise<void> {
    const email = emailInput.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.status === 'DISABLED') return;

    const token = await this.createEmailToken(
      user.id,
      'RESET_PASSWORD',
      env.RESET_PASSWORD_TOKEN_MINUTES,
    );

    await this.mail.sendPasswordReset(
      user.email,
      user.name,
      `${env.WEB_URL}/reset-password?token=${token}`,
    );
  }

  /** Sets a new password and signs the person out everywhere. */
  async reset(input: ResetPasswordInput, meta: RequestMeta): Promise<void> {
    const token = await this.prisma.emailToken.findUnique({
      where: { tokenHash: hashToken(input.token) },
      include: { user: { include: { roles: true } } },
    });

    if (!token || token.type !== 'RESET_PASSWORD' || token.usedAt !== null) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'This reset link is not valid any more',
      });
    }

    if (token.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException({
        code: 'TOKEN_EXPIRED',
        message: 'This reset link has expired',
      });
    }

    const passwordHash = await this.passwords.hash(input.password);

    await this.prisma.$transaction(async (tx) => {
      await tx.emailToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
      });

      await this.audit.record(
        {
          actorId: token.userId,
          actorRole: primaryRole(token.user),
          action: 'auth.password_reset',
          targetType: 'user',
          targetId: token.userId,
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );
    });

    await this.sessions.revokeAllForUser(token.userId);
  }

  /** Confirms an email address with a single use token. */
  async verifyEmail(tokenInput: string, meta: RequestMeta): Promise<void> {
    const token = await this.prisma.emailToken.findUnique({
      where: { tokenHash: hashToken(tokenInput) },
      include: { user: { include: { roles: true } } },
    });

    if (!token || token.type !== 'VERIFY_EMAIL' || token.usedAt !== null) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'This verification link is not valid any more',
      });
    }

    if (token.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException({
        code: 'TOKEN_EXPIRED',
        message: 'This verification link has expired',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.emailToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });

      await tx.user.update({
        where: { id: token.userId },
        data: { emailVerifiedAt: new Date() },
      });

      await this.audit.record(
        {
          actorId: token.userId,
          actorRole: primaryRole(token.user),
          action: 'auth.email_verified',
          targetType: 'user',
          targetId: token.userId,
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );
    });
  }

  /** Sends a new verification email. Always answers the same way. */
  async resendVerification(emailInput: string): Promise<void> {
    const email = emailInput.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.emailVerifiedAt !== null || user.status !== 'ACTIVE') return;

    const token = await this.createEmailToken(
      user.id,
      'VERIFY_EMAIL',
      env.VERIFY_EMAIL_TOKEN_MINUTES,
    );

    await this.mail.sendVerifyEmail(
      user.email,
      user.name,
      `${env.WEB_URL}/verify-email?token=${token}`,
    );
  }

  /**
   * Accepts a staff invitation: the invite link sets the password and the
   * account becomes active.
   */
  async acceptInvite(
    tokenInput: string,
    password: string,
    meta: RequestMeta,
  ): Promise<{ token: string; user: Awaited<ReturnType<AuthService['publicUser']>> }> {
    const token = await this.prisma.emailToken.findUnique({
      where: { tokenHash: hashToken(tokenInput) },
      include: { user: { include: { roles: true } } },
    });

    if (!token || token.type !== 'INVITE' || token.usedAt !== null) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'This invitation link is not valid any more',
      });
    }

    if (token.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException({
        code: 'TOKEN_EXPIRED',
        message: 'This invitation link has expired',
      });
    }

    const passwordHash = await this.passwords.hash(password);

    await this.prisma.$transaction(async (tx) => {
      await tx.emailToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });

      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date() },
      });

      await this.audit.record(
        {
          actorId: token.userId,
          actorRole: primaryRole(token.user),
          action: 'auth.invite_accepted',
          targetType: 'user',
          targetId: token.userId,
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );
    });

    const session = await this.sessions.create(token.userId, meta);

    return { token: session.token, user: await this.publicUser(token.userId) };
  }

  /** The signed in person, without the password hash. */
  async publicUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: { include: { permissions: true } } } } },
    });

    if (!user) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Sign in to continue' });
    }

    const assignment = user.roles.find((entry) => entry.isPrimary) ?? user.roles[0];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      locale: user.locale as Locale,
      status: user.status,
      emailVerified: user.emailVerifiedAt !== null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      role: assignment?.roleName ?? 'CUSTOMER',
      permissions: assignment?.role.permissions.map((entry) => entry.permissionKey) ?? [],
    };
  }

  /**
   * Creates a single use email token. Only the hash is stored, and the
   * previous unused token of the same kind stops working.
   */
  private async createEmailToken(
    userId: string,
    type: EmailTokenType,
    ttlMinutes: number,
  ): Promise<string> {
    const token = randomBytes(32).toString('base64url');

    await this.prisma.$transaction(async (tx) => {
      await tx.emailToken.updateMany({
        where: { userId, type, usedAt: null },
        data: { usedAt: new Date() },
      });

      await tx.emailToken.create({
        data: {
          userId,
          type,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
        },
      });
    });

    return token;
  }

  /** The generic sign in error, with the lock information when there is one. */
  private loginError(lockedUntil?: Date | null): UnauthorizedException {
    return new UnauthorizedException({
      code: lockedUntil ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS',
      message: GENERIC_LOGIN_ERROR,
      ...(lockedUntil
        ? {
            details: {
              retryAfterSeconds: Math.max(
                0,
                Math.ceil((lockedUntil.getTime() - Date.now()) / 1000),
              ),
              lockedUntil: lockedUntil.toISOString(),
            },
          }
        : {}),
    });
  }
}

/** Exported for the tests: the hash of a token, so they can look one up. */
export function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
