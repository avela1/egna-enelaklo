import { z } from 'zod';
import { PERMISSION_KEYS } from '../permissions';
import {
  LocalizedTextSchema,
  ServiceDescriptionSchema,
  TemplateDefinitionSchema,
} from '../templates';
import { EmailSchema, NameSchema, UserStatusSchema } from './auth';

/** The roles a staff user can be invited as. */
export const StaffRoleSchema = z.enum(['OPERATIONS', 'FINANCE', 'ADMIN']);
export type StaffRole = z.infer<typeof StaffRoleSchema>;

/** Invite a staff user. */
export const InviteUserSchema = z.object({
  email: EmailSchema,
  name: NameSchema,
  role: StaffRoleSchema,
});
export type InviteUserInput = z.input<typeof InviteUserSchema>;
export type InviteUserValues = z.output<typeof InviteUserSchema>;

/** Change the role of a staff user. */
export const ChangeUserRoleSchema = z.object({
  role: StaffRoleSchema,
});
export type ChangeUserRoleValues = z.output<typeof ChangeUserRoleSchema>;

/** Filter the staff user list. */
export const StaffUserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['CUSTOMER', 'TASKER', 'OPERATIONS', 'FINANCE', 'ADMIN']).optional(),
  search: z.string().trim().min(1).optional(),
  status: UserStatusSchema.optional(),
});
export type StaffUserQuery = z.output<typeof StaffUserQuerySchema>;

/** Replace the permissions of a role. */
export const RolePermissionsSchema = z.object({
  permissions: z.array(z.enum(PERMISSION_KEYS)),
});
export type RolePermissionsValues = z.output<typeof RolePermissionsSchema>;

/** Create a service in the catalogue. */
export const CreateServiceSchema = z.object({
  description: ServiceDescriptionSchema,
  icon: z.string().min(1),
  key: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9_]+$/, 'validation.invalid'),
  name: LocalizedTextSchema,
});
export type CreateServiceValues = z.output<typeof CreateServiceSchema>;

/** Update a service in the catalogue. */
export const UpdateServiceSchema = z.object({
  description: ServiceDescriptionSchema.optional(),
  icon: z.string().min(1).optional(),
  name: LocalizedTextSchema.optional(),
  sortOrder: z.number().int().optional(),
  status: z.enum(['DRAFT', 'DISABLED', 'LIVE']).optional(),
});
export type UpdateServiceValues = z.output<typeof UpdateServiceSchema>;

/** Filter the audit log. */
export const AuditQuerySchema = z.object({
  actor: z.string().trim().min(1).optional(),
  action: z.string().trim().min(1).optional(),
  from: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
});
export type AuditQuery = z.output<typeof AuditQuerySchema>;

/** Save the definition of a draft template. */
export const SaveTemplateSchema = z.object({
  definition: TemplateDefinitionSchema,
});
export type SaveTemplateValues = z.output<typeof SaveTemplateSchema>;
