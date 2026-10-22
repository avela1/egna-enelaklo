import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Session } from '@prisma/client';
import { env } from '../../config/env';
import type { PrismaService } from '../prisma/prisma.service';
import type { UsersService } from './users.service';
import type { Principal } from '../auth/principal';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** The server only ever stores the hash of a session token. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface SessionMeta {
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  /** Starts a session and returns the raw token, which is only sent in the cookie. */
  async create(userId: string, meta: SessionMeta): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.SESSION_TTL_DAYS * DAY_MS);

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    return { token, expiresAt };
  }

  /** Resolves a raw token into a session and its principal. */
  async resolve(token: string): Promise<{ session: Session; principal: Principal } | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    if (!session) return null;

    const now = new Date();
    if (session.revokedAt !== null) return null;
    if (session.expiresAt.getTime() <= now.getTime()) return null;
    if (session.user.status !== 'ACTIVE') return null;

    await this.touch(session, now);

    const principal = await this.users.resolvePrincipal(session.userId, session.id);
    if (!principal) return null;

    return { session, principal };
  }

  /**
   * Slides the expiry forward, but never past the absolute lifetime of the
   * session. The write happens at most once an hour.
   */
  private async touch(session: Session, now: Date): Promise<void> {
    if (now.getTime() - session.lastSeenAt.getTime() < HOUR_MS) return;

    const absoluteExpiresAt = session.createdAt.getTime() + env.SESSION_ABSOLUTE_TTL_DAYS * DAY_MS;
    const expiresAt = new Date(
      Math.min(now.getTime() + env.SESSION_TTL_DAYS * DAY_MS, absoluteExpiresAt),
    );

    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: now, expiresAt },
    });
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Revokes every session of a person. Returns how many were revoked. */
  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return result.count;
  }
}
