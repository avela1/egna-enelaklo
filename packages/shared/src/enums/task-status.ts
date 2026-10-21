/**
 * Task lifecycle states.
 *
 * IMPORTANT: a task status may only ever change through the single
 * TaskStateMachine service (introduced in a later phase). Never update
 * `status` directly from a controller, a job or a script.
 */
export const TaskStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  IN_REVIEW: 'IN_REVIEW',
  NEEDS_INFO: 'NEEDS_INFO',
  QUOTED: 'QUOTED',
  APPROVED: 'APPROVED',
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  EXCEPTION: 'EXCEPTION',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TASK_STATUS_VALUES = Object.values(TaskStatus) as [TaskStatus, ...TaskStatus[]];

/** Ordered list of statuses, used for filters, chips and future state machine work. */
export const TASK_STATUS_ORDER: readonly TaskStatus[] = TASK_STATUS_VALUES;
