import { z } from 'zod';
import { ROLE_VALUES } from '../enums/role';
import { SERVICE_TYPE_VALUES } from '../enums/service-type';
import { TASK_STATUS_VALUES } from '../enums/task-status';

export const TaskStatusSchema = z.enum(TASK_STATUS_VALUES);
export const RoleSchema = z.enum(ROLE_VALUES);
export const ServiceTypeSchema = z.enum(SERVICE_TYPE_VALUES);

/** Common pagination contract for list endpoints. */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
  });

export type TaskStatusInput = z.input<typeof TaskStatusSchema>;
export type RoleInput = z.input<typeof RoleSchema>;
export type ServiceTypeInput = z.input<typeof ServiceTypeSchema>;
