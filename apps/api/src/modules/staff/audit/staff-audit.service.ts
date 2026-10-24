import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuditQuery } from '@egna-enelaklo/shared';
import { AuditService } from '../../../common/audit/audit.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { Principal } from '../../../common/auth/principal';
import type { RequestMeta } from '../../../common/http/request-meta';

export interface AuditRow {
  action: string;
  actorEmail: string | null;
  actorId: string | null;
  actorName: string | null;
  actorRole: string;
  id: string;
  ip: string | null;
  requestId: string | null;
  targetId: string;
  targetType: string;
  createdAt: string;
  detail: string | null;
}

@Injectable()
export class StaffAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** The audit log, newest first, with the filters of the staff console. */
  async list(query: AuditQuery) {
    const where = await this.buildWhere(query);
    const skip = (query.page - 1) * query.pageSize;

    const [entries, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const actors = await this.actorsFor(entries.map((entry) => entry.actorId));

    return {
      items: entries.map((entry) => this.toRow(entry, actors)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  /** Every entry that matches the filters, for the CSV export. */
  async exportRows(query: AuditQuery): Promise<AuditRow[]> {
    const entries = await this.prisma.auditLog.findMany({
      where: await this.buildWhere(query),
      orderBy: { createdAt: 'desc' },
      take: 10_000,
    });

    const actors = await this.actorsFor(entries.map((entry) => entry.actorId));

    return entries.map((entry) => this.toRow(entry, actors));
  }

  /** Records that somebody exported the audit log. */
  async recordExport(principal: Principal, meta: RequestMeta, rows: number): Promise<void> {
    await this.audit.record({
      actorId: principal.id,
      actorRole: principal.role,
      action: 'audit.exported',
      targetType: 'audit_log',
      targetId: 'export',
      after: { rows },
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
  }

  private async buildWhere(query: AuditQuery): Promise<Prisma.AuditLogWhereInput> {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };

    if (query.search) {
      where.OR = [
        { targetId: { contains: query.search, mode: 'insensitive' } },
        { targetType: { contains: query.search, mode: 'insensitive' } },
        { action: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.actor) {
      // The filter accepts the name, the email address, the id or the role.
      const people = await this.prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: query.actor, mode: 'insensitive' } },
            { name: { contains: query.actor, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });

      where.OR = [
        ...(where.OR ?? []),
        { actorId: { equals: query.actor, mode: 'insensitive' } },
        { actorRole: { equals: query.actor, mode: 'insensitive' } },
        ...(people.length > 0 ? [{ actorId: { in: people.map((person) => person.id) } }] : []),
      ];
    }

    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    return where;
  }

  private async actorsFor(
    actorIds: (string | null)[],
  ): Promise<Map<string, { email: string; name: string }>> {
    const ids = [...new Set(actorIds.filter((id): id is string => id !== null))];
    if (ids.length === 0) return new Map();

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true, name: true },
    });

    return new Map(users.map((user) => [user.id, { email: user.email, name: user.name }]));
  }

  private toRow(
    entry: {
      action: string;
      actorId: string | null;
      actorRole: string;
      after: unknown;
      before: unknown;
      createdAt: Date;
      id: string;
      ip: string | null;
      requestId: string | null;
      targetId: string;
      targetType: string;
    },
    actors: Map<string, { email: string; name: string }>,
  ): AuditRow {
    const actor = entry.actorId ? actors.get(entry.actorId) : undefined;

    return {
      id: entry.id,
      createdAt: entry.createdAt.toISOString(),
      actorId: entry.actorId,
      actorName: actor?.name ?? null,
      actorEmail: actor?.email ?? null,
      actorRole: entry.actorRole,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      detail: describeChange(entry.before, entry.after),
      ip: entry.ip,
      requestId: entry.requestId,
    };
  }
}

/** A short, human readable description of what changed. */
function describeChange(before: unknown, after: unknown): string | null {
  const beforeValue = asRecord(before);
  const afterValue = asRecord(after);

  if (!beforeValue && !afterValue) return null;

  const keys = new Set([...Object.keys(beforeValue ?? {}), ...Object.keys(afterValue ?? {})]);
  const changes: string[] = [];

  for (const key of keys) {
    const from = beforeValue?.[key];
    const to = afterValue?.[key];

    if (JSON.stringify(from) === JSON.stringify(to)) continue;

    changes.push(
      from === undefined
        ? `${key}: ${JSON.stringify(to)}`
        : `${key}: ${JSON.stringify(from)} -> ${JSON.stringify(to)}`,
    );
  }

  return changes.length > 0 ? changes.join('; ') : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Escapes a value for a CSV file. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';

  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;

  return text;
}
