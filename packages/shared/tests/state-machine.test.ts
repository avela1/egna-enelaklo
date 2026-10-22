import { describe, expect, it } from 'vitest';
import { TaskStatus } from '../src/enums/task-status';
import {
  ACTOR_ROLES,
  canTransition,
  listTransitions,
  TASK_TRANSITIONS,
} from '../src/state-machine';

describe('the task state machine', () => {
  it('allows every transition of the table for the actors that may do it', () => {
    const transitions = listTransitions();

    expect(transitions.length).toBeGreaterThan(20);

    for (const transition of transitions) {
      for (const actor of transition.actors) {
        expect(canTransition(transition.from, transition.to, actor)).toBe(true);
      }
    }
  });

  it('forbids every other actor for every transition', () => {
    for (const transition of listTransitions()) {
      for (const actor of ACTOR_ROLES) {
        if (transition.actors.includes(actor)) continue;

        expect(canTransition(transition.from, transition.to, actor)).toBe(false);
      }
    }
  });

  it('forbids a jump that is not in the table', () => {
    expect(canTransition(TaskStatus.DRAFT, TaskStatus.APPROVED, 'customer')).toBe(false);
    expect(canTransition(TaskStatus.DRAFT, TaskStatus.SUBMITTED, 'staff')).toBe(false);
    expect(canTransition(TaskStatus.SUBMITTED, TaskStatus.COMPLETED, 'customer')).toBe(false);
    expect(canTransition(TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS, 'staff')).toBe(false);
    expect(canTransition(TaskStatus.REFUNDED, TaskStatus.APPROVED, 'staff')).toBe(false);
  });

  it('lets the customer submit and cancel a draft', () => {
    expect(canTransition(TaskStatus.DRAFT, TaskStatus.SUBMITTED, 'customer')).toBe(true);
    expect(canTransition(TaskStatus.DRAFT, TaskStatus.CANCELLED, 'customer')).toBe(true);
  });

  it('keeps the last refund with finance', () => {
    expect(canTransition(TaskStatus.CANCELLED, TaskStatus.REFUNDED, 'finance')).toBe(true);
    expect(canTransition(TaskStatus.COMPLETED, TaskStatus.REFUNDED, 'finance')).toBe(true);
    expect(canTransition(TaskStatus.CANCELLED, TaskStatus.REFUNDED, 'staff')).toBe(false);
  });

  it('has no way out of a refunded task', () => {
    expect(TASK_TRANSITIONS[TaskStatus.REFUNDED]).toEqual({});
  });
});
