import { TaskStatus } from './enums/task-status';

/** Who wants to change the status of a task. */
export const ACTOR_ROLES = ['customer', 'staff', 'tasker', 'finance', 'system'] as const;

export type ActorRole = (typeof ACTOR_ROLES)[number];

/**
 * The transitions of the task lifecycle.
 *
 * A task status only ever changes through the TaskStateMachine service in the
 * API, which asks this table first. Everything that is not listed here is
 * forbidden.
 */
export const TASK_TRANSITIONS: Record<TaskStatus, Partial<Record<TaskStatus, ActorRole[]>>> = {
  [TaskStatus.DRAFT]: {
    [TaskStatus.SUBMITTED]: ['customer'],
    [TaskStatus.CANCELLED]: ['customer'],
  },
  [TaskStatus.SUBMITTED]: {
    [TaskStatus.IN_REVIEW]: ['staff'],
    [TaskStatus.CANCELLED]: ['customer', 'staff'],
  },
  [TaskStatus.IN_REVIEW]: {
    [TaskStatus.NEEDS_INFO]: ['staff'],
    [TaskStatus.QUOTED]: ['staff'],
    [TaskStatus.CANCELLED]: ['staff'],
  },
  [TaskStatus.NEEDS_INFO]: {
    [TaskStatus.IN_REVIEW]: ['customer', 'staff'],
    [TaskStatus.CANCELLED]: ['customer', 'staff'],
  },
  [TaskStatus.QUOTED]: {
    [TaskStatus.APPROVED]: ['customer'],
    [TaskStatus.IN_REVIEW]: ['staff'],
    [TaskStatus.CANCELLED]: ['customer', 'staff', 'system'],
  },
  [TaskStatus.APPROVED]: {
    [TaskStatus.ASSIGNED]: ['staff'],
    [TaskStatus.CANCELLED]: ['staff'],
  },
  [TaskStatus.ASSIGNED]: {
    [TaskStatus.ACCEPTED]: ['tasker'],
    [TaskStatus.APPROVED]: ['tasker', 'staff', 'system'],
  },
  [TaskStatus.ACCEPTED]: {
    [TaskStatus.IN_PROGRESS]: ['tasker'],
    [TaskStatus.APPROVED]: ['staff'],
  },
  [TaskStatus.IN_PROGRESS]: {
    [TaskStatus.DELIVERED]: ['tasker'],
    [TaskStatus.EXCEPTION]: ['tasker', 'staff'],
  },
  [TaskStatus.DELIVERED]: {
    [TaskStatus.COMPLETED]: ['customer', 'system'],
    [TaskStatus.EXCEPTION]: ['customer', 'staff'],
  },
  [TaskStatus.EXCEPTION]: {
    [TaskStatus.IN_PROGRESS]: ['staff'],
    [TaskStatus.APPROVED]: ['staff'],
    [TaskStatus.CANCELLED]: ['staff'],
    [TaskStatus.REFUNDED]: ['staff', 'finance'],
  },
  [TaskStatus.CANCELLED]: {
    [TaskStatus.REFUNDED]: ['finance'],
  },
  [TaskStatus.COMPLETED]: {
    [TaskStatus.REFUNDED]: ['finance'],
  },
  [TaskStatus.REFUNDED]: {},
};

/** True when the actor may move a task from one status to the other. */
export function canTransition(from: TaskStatus, to: TaskStatus, actor: ActorRole): boolean {
  const allowed = TASK_TRANSITIONS[from]?.[to];

  return Array.isArray(allowed) && allowed.includes(actor);
}

/** Every transition of the table, for the tests and the documentation. */
export function listTransitions(): { from: TaskStatus; to: TaskStatus; actors: ActorRole[] }[] {
  const transitions: { from: TaskStatus; to: TaskStatus; actors: ActorRole[] }[] = [];

  for (const from of Object.keys(TASK_TRANSITIONS) as TaskStatus[]) {
    for (const [to, actors] of Object.entries(TASK_TRANSITIONS[from] ?? {})) {
      transitions.push({ from, to: to as TaskStatus, actors: actors ?? [] });
    }
  }

  return transitions;
}
