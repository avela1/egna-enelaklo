import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { TaskStatus } from '@egna-enelaklo/shared';
import { TaskQuerySchema, type TaskQuery } from '@egna-enelaklo/shared';
import { RequirePermission } from '../../common/auth/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('staff tasks')
@Controller('staff/tasks')
@RequirePermission('tasks.view')
export class StaffTasksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'The submitted tasks (temporary list, the real queue comes later)' })
  @ApiOkResponse({ description: 'A paginated list of tasks' })
  async list(@Query(new ZodValidationPipe(TaskQuerySchema)) query: TaskQuery) {
    const skip = (query.page - 1) * query.pageSize;

    const [tasks, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where: {
          ...(query.group ? { status: { in: groupStatuses(query.group) } } : {}),
          ...(query.search
            ? {
                OR: [
                  { ref: { contains: query.search, mode: 'insensitive' } },
                  { customer: { email: { contains: query.search, mode: 'insensitive' } } },
                  { customer: { name: { contains: query.search, mode: 'insensitive' } } },
                ],
              }
            : {}),
        },
        include: {
          service: { select: { key: true, name: true, icon: true } },
          customer: { select: { id: true, name: true, email: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.task.count(),
    ]);

    return {
      items: tasks.map((task) => ({
        id: task.id,
        ref: task.ref,
        status: task.status,
        serviceKey: task.service.key,
        serviceName: task.service.name,
        customerName: task.customer.name,
        customerEmail: task.customer.email,
        subCity: task.subCity,
        submittedAt: task.submittedAt?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'One task, read only' })
  async detail(@Param('id') id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        service: { select: { key: true, name: true, icon: true } },
        template: { select: { id: true, version: true, definition: true } },
        customer: { select: { id: true, name: true, email: true } },
        history: { orderBy: { createdAt: 'asc' } },
      },
    });

    return task;
  }
}

function groupStatuses(group: TaskQuery['group']): TaskStatus[] | undefined {
  if (group === 'active') {
    return [
      'SUBMITTED',
      'IN_REVIEW',
      'NEEDS_INFO',
      'QUOTED',
      'APPROVED',
      'ASSIGNED',
      'ACCEPTED',
      'IN_PROGRESS',
      'DELIVERED',
      'EXCEPTION',
    ] as TaskStatus[];
  }

  if (group === 'completed') return ['COMPLETED', 'CANCELLED', 'REFUNDED'] as TaskStatus[];
  if (group === 'waiting') return ['DRAFT', 'NEEDS_INFO'] as TaskStatus[];

  return undefined;
}
