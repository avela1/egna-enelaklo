import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  buildZodSchema,
  extractMappedValues,
  summarizePayload,
  TaskStatus,
  type TaskPayload,
  type TemplateDefinition,
} from '@egna-enelaklo/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddressesService } from '../addresses/addresses.service';
import { ProhibitedService } from './prohibited.service';
import { TaskStateMachine } from './task-state-machine.service';

export type TaskGroup = 'active' | 'completed' | 'waiting';

const GROUP_STATUSES: Record<TaskGroup, TaskStatus[]> = {
  active: [
    TaskStatus.SUBMITTED,
    TaskStatus.IN_REVIEW,
    TaskStatus.NEEDS_INFO,
    TaskStatus.QUOTED,
    TaskStatus.APPROVED,
    TaskStatus.ASSIGNED,
    TaskStatus.ACCEPTED,
    TaskStatus.IN_PROGRESS,
    TaskStatus.DELIVERED,
    TaskStatus.EXCEPTION,
  ],
  completed: [TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.REFUNDED],
  waiting: [TaskStatus.DRAFT, TaskStatus.NEEDS_INFO],
};

export interface TaskListQuery {
  group?: TaskGroup;
  page: number;
  pageSize: number;
  search?: string;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly addresses: AddressesService,
    private readonly prohibited: ProhibitedService,
    private readonly stateMachine: TaskStateMachine,
  ) {}

  /** Creates a draft task for the live template of a service. */
  async createDraft(customerId: string, serviceKey: string) {
    const service = await this.prisma.service.findFirst({
      where: { key: serviceKey, status: 'LIVE' },
      include: { templates: { where: { status: 'LIVE' }, orderBy: { version: 'desc' } } },
    });

    if (!service || service.templates.length === 0) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Service not found' });
    }

    const template = service.templates[0];

    if (!template) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Service not found' });
    }

    const task = await this.prisma.task.create({
      data: {
        customerId,
        serviceId: service.id,
        templateId: template.id,
        status: 'DRAFT',
        payload: {},
      },
    });

    return {
      id: task.id,
      ref: task.ref,
      status: task.status,
      serviceKey: service.key,
      serviceName: service.name,
      templateId: template.id,
      templateVersion: template.version,
      createdAt: task.createdAt.toISOString(),
    };
  }

  /** Autosave: a partial payload is merged into the draft, without validation. */
  async updateDraft(customerId: string, taskId: string, payload: TaskPayload) {
    const task = await this.findOwned(customerId, taskId);

    if (task.status !== TaskStatus.DRAFT) {
      throw new BadRequestException({
        code: 'TASK_NOT_EDITABLE',
        message: 'Only a draft can be changed',
      });
    }

    const current = { ...(task.payload as TaskPayload) };
    delete current['__meta'];

    const merged: TaskPayload = { ...current };

    for (const [key, value] of Object.entries(payload)) {
      if (key === '__meta') continue;
      if (value === undefined) {
        delete merged[key];
        continue;
      }
      merged[key] = value;
    }

    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data: { payload: merged as Prisma.InputJsonValue },
    });

    return { id: updated.id, ref: updated.ref, savedAt: updated.updatedAt.toISOString() };
  }

  /** Validates the draft with its own template version and submits it. */
  async submit(customerId: string, taskId: string) {
    const task = await this.findOwned(customerId, taskId);

    if (task.status !== TaskStatus.DRAFT) {
      throw new BadRequestException({
        code: 'TASK_NOT_SUBMITTABLE',
        message: 'Only a draft can be submitted',
      });
    }

    const template = await this.prisma.serviceTemplate.findUnique({
      where: { id: task.templateId },
    });

    if (!template) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Template not found' });
    }

    const definition = template.definition as unknown as TemplateDefinition;
    const payload = { ...(task.payload as TaskPayload) };
    delete payload['__meta'];

    const result = buildZodSchema(definition).safeParse(payload);

    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Some answers are missing or not valid',
        details: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      });
    }

    const answers = result.data as TaskPayload;
    const mapped = extractMappedValues(definition, answers);

    // The addresses have to belong to the customer.
    for (const addressId of [mapped.pickupAddressId, mapped.deliveryAddressId]) {
      if (!addressId) continue;
      await this.addresses.findOwned(customerId, addressId);
    }

    const matches = await this.prohibited.check(answers);
    const deliveryAddress = mapped.deliveryAddressId
      ? await this.prisma.address.findFirst({
          where: { id: mapped.deliveryAddressId, userId: customerId, deletedAt: null },
        })
      : null;
    const pickupAddress = mapped.pickupAddressId
      ? await this.prisma.address.findFirst({
          where: { id: mapped.pickupAddressId, userId: customerId, deletedAt: null },
        })
      : null;

    const payloadWithMeta = {
      ...answers,
      __meta: { prohibitedMatches: matches },
    } as unknown as Prisma.InputJsonValue;

    await this.prisma.task.update({
      where: { id: task.id },
      data: {
        payload: payloadWithMeta,
        budgetCapSantim: mapped.budgetCapSantim ?? null,
        deadlineAt: mapped.deadlineAt ?? null,
        pickupAddressId: mapped.pickupAddressId ?? null,
        deliveryAddressId: mapped.deliveryAddressId ?? null,
        subCity: deliveryAddress?.subCity ?? pickupAddress?.subCity ?? null,
      },
    });

    await this.stateMachine.transition(task.id, TaskStatus.SUBMITTED, {
      id: customerId,
      role: 'customer',
    });

    return { id: task.id, ref: task.ref, status: TaskStatus.SUBMITTED };
  }

  /** Cancels a draft or a submitted task. */
  async cancel(customerId: string, taskId: string, reason?: string) {
    const task = await this.findOwned(customerId, taskId);

    if (task.status !== TaskStatus.DRAFT && task.status !== TaskStatus.SUBMITTED) {
      throw new BadRequestException({
        code: 'TASK_NOT_CANCELLABLE',
        message: 'This task can no longer be cancelled',
      });
    }

    await this.stateMachine.transition(
      task.id,
      TaskStatus.CANCELLED,
      {
        id: customerId,
        role: 'customer',
      },
      reason,
    );

    return { id: task.id, ref: task.ref, status: TaskStatus.CANCELLED };
  }

  /** The tasks of a customer. */
  async list(customerId: string, query: TaskListQuery) {
    const where: Prisma.TaskWhereInput = { customerId };

    if (query.group) {
      where.status = { in: GROUP_STATUSES[query.group] };
    }

    if (query.search) {
      where.OR = [
        { ref: { contains: query.search, mode: 'insensitive' } },
        { service: { key: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const skip = (query.page - 1) * query.pageSize;

    const [tasks, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        include: {
          service: { select: { key: true, name: true, icon: true } },
          template: { select: { id: true, version: true, definition: true } },
          _count: { select: { attachments: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      items: tasks.map((task) => {
        const definition = task.template.definition as unknown as TemplateDefinition;
        const payload = task.payload as TaskPayload;

        return {
          id: task.id,
          ref: task.ref,
          status: task.status,
          serviceKey: task.service.key,
          serviceName: task.service.name,
          icon: task.service.icon,
          templateVersion: task.template.version,
          title: summarizePayload(definition, payload),
          subCity: task.subCity,
          budgetCapSantim: task.budgetCapSantim,
          attachmentCount: task._count.attachments,
          deadlineAt: task.deadlineAt?.toISOString() ?? null,
          submittedAt: task.submittedAt?.toISOString() ?? null,
          updatedAt: task.updatedAt.toISOString(),
          createdAt: task.createdAt.toISOString(),
        };
      }),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  /** One task of a customer, with everything that belongs to it. */
  async detail(customerId: string, taskId: string) {
    const task = await this.findOwned(customerId, taskId);

    const definition = task.template.definition as unknown as TemplateDefinition;
    const payload = task.payload as TaskPayload;

    return {
      id: task.id,
      ref: task.ref,
      status: task.status,
      serviceKey: task.service.key,
      serviceName: task.service.name,
      icon: task.service.icon,
      templateId: task.template.id,
      templateVersion: task.template.version,
      definition,
      payload,
      title: summarizePayload(definition, payload),
      budgetCapSantim: task.budgetCapSantim,
      deadlineAt: task.deadlineAt?.toISOString() ?? null,
      subCity: task.subCity,
      pickupAddressId: task.pickupAddressId,
      deliveryAddressId: task.deliveryAddressId,
      submittedAt: task.submittedAt?.toISOString() ?? null,
      cancelledAt: task.cancelledAt?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      attachments: task.attachments.map((attachment) => ({
        id: attachment.id,
        kind: attachment.kind,
        fileName: attachment.fileName,
        contentType: attachment.contentType,
        sizeBytes: attachment.sizeBytes,
      })),
      history: task.history.map((entry) => ({
        id: entry.id,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        actorRole: entry.actorRole,
        note: entry.note,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }

  /** The task of this customer, or a 404 when it is not theirs. */
  async findOwned(customerId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, customerId },
      include: {
        service: { select: { id: true, key: true, name: true, icon: true } },
        template: { select: { id: true, version: true, definition: true } },
        history: { orderBy: { createdAt: 'asc' } },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!task) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Task not found' });
    }

    return task;
  }
}
