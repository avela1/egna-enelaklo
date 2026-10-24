import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  action: string;
  actorId?: string | null;
  actorRole: string;
  after?: unknown;
  before?: unknown;
  ip?: string | null;
  requestId?: string | null;
  targetId: string;
  targetType: string;
  userAgent?: string | null;
}

const SECRET_KEYS = [
  'password',
  'passwordhash',
  'token',
  'tokenhash',
  'secret',
  'sessiontoken',
  'csrf',
];

/**
 * Removes anything that must never reach the audit log: password hashes,
 * session tokens, email tokens and secrets.
 */
export function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => sanitizeAuditValue(entry));

  if (value !== null && typeof value === 'object') {
    /** @type {Record<string, unknown>} */
    const output: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEYS.includes(key.toLowerCase())) continue;
      output[key] = sanitizeAuditValue(child);
    }

    return output;
  }

  return value;
}

/**
 * Writes the append-only audit log.
 *
 * Call it with the transaction client of the change it describes, so the
 * audit row and the change are committed together or not at all.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;

    const before =
      entry.before === undefined
        ? undefined
        : (sanitizeAuditValue(entry.before) as Prisma.InputJsonValue);
    const after =
      entry.after === undefined
        ? undefined
        : (sanitizeAuditValue(entry.after) as Prisma.InputJsonValue);

    await client.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorRole: entry.actorRole,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        ...(before === undefined ? {} : { before }),
        ...(after === undefined ? {} : { after }),
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        requestId: entry.requestId ?? null,
      },
    });
  }
}
