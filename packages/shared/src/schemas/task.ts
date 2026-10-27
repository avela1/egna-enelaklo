import { z } from 'zod';

/** Create a draft task for a service. */
export const CreateTaskSchema = z.object({
  serviceKey: z.string().trim().min(1),
});
export type CreateTaskValues = z.output<typeof CreateTaskSchema>;

/** Autosave a draft. The payload is not validated here. */
export const UpdateTaskSchema = z.object({
  payload: z.record(z.unknown()),
});
export type UpdateTaskValues = z.output<typeof UpdateTaskSchema>;

/** Cancel a task. */
export const CancelTaskSchema = z.object({
  reason: z.string().trim().max(400).optional(),
});
export type CancelTaskValues = z.output<typeof CancelTaskSchema>;

/** Filter the task list. */
export const TaskQuerySchema = z.object({
  group: z.enum(['active', 'completed', 'waiting']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
});
export type TaskQuery = z.output<typeof TaskQuerySchema>;

/** Ask for an upload URL. */
export const UploadSignSchema = z.object({
  contentType: z.enum(['application/pdf', 'image/heic', 'image/jpeg', 'image/png']),
  fileName: z.string().trim().min(1).max(200),
  kind: z.enum(['AUTHORIZATION_LETTER', 'OTHER', 'REFERENCE_PHOTO']).default('OTHER'),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(5 * 1024 * 1024),
  taskId: z.string().uuid().optional(),
});
export type UploadSignValues = z.output<typeof UploadSignSchema>;

/** Attach an uploaded file to a task. */
export const LinkAttachmentSchema = z.object({
  taskId: z.string().uuid(),
});
export type LinkAttachmentValues = z.output<typeof LinkAttachmentSchema>;
