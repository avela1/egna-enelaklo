import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { TaskStatus } from '@egna-enelaklo/shared';
import { canTransition, type ActorRole } from '@egna-enelaklo/shared';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestMeta } from '../../common/http/request-meta';

export interface TransitionActor {
  /** The id of the person, or null for a system action. */
  id?: string | null;
  /** The role of the actor in the flow: customer, staff, tasker, finance, system. */
  role: ActorRole;
}

const STAFF_ROLES: ActorRole[] = ['staff', 'finance'];

/**
 * The only service that may change the status of a task.
 *
 * It locks the task, asks the shared transition table, writes the change, the
 * history row and, for staff, the audit row, all in one transaction.
 */
@Injectable()
export class TaskStateMachine {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async transition(
    taskId: string,
    to: TaskStatus,
    actor: TransitionActor,
    note?: string,
    meta?: RequestMeta,
    /** Pass the surrounding transaction so the transition joins it. */
    tx?: Prisma.TransactionClient,
  ) {
    const run = (client: Prisma.TransactionClient) =>
      this.transitionIn(client, taskId, to, actor, note, meta);

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  private async transitionIn(
    tx: Prisma.TransactionClient,
    taskId: string,
    to: TaskStatus,
    actor: TransitionActor,
    note?: string,
    meta?: RequestMeta,
  ) {
    // The row lock makes two parallel transitions impossible.
    await tx.$queryRaw`SELECT id FROM tasks WHERE id = ${taskId}::uuid FOR UPDATE`;

    const task = await tx.task.findUnique({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Task not found' });
    }

    if (!canTransition(task.status, to, actor.role)) {
      throw new BadRequestException({
        code: 'INVALID_TRANSITION',
        message: `A task cannot go from ${task.status} to ${to} for a ${actor.role}`,
        details: { from: task.status, to, actor: actor.role },
      });
    }

    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        status: to,
        ...(to === TaskStatus.SUBMITTED ? { submittedAt: new Date() } : {}),
        ...(to === TaskStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
      },
    });

    await tx.taskStatusHistory.create({
      data: {
        taskId,
        fromStatus: task.status,
        toStatus: to,
        actorId: actor.id ?? null,
        actorRole: actor.role,
        note: note ?? null,
      },
    });

    if (STAFF_ROLES.includes(actor.role)) {
      await this.audit.record(
        {
          actorId: actor.id ?? null,
          actorRole: actor.role,
          action: 'task.status_changed',
          targetType: 'task',
          targetId: taskId,
          before: { status: task.status },
          after: { status: to, ...(note ? { note } : {}) },
          ip: meta?.ip,
          userAgent: meta?.userAgent,
          requestId: meta?.requestId,
        },
        tx,
      );
    }

    return updated;
  }
}
