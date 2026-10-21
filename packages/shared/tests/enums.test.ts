import { describe, expect, it } from 'vitest';
import { Role, ServiceType, TaskStatus } from '../src/enums';

describe('enums', () => {
  it('exposes the full task lifecycle', () => {
    expect(Object.values(TaskStatus)).toEqual([
      'DRAFT',
      'SUBMITTED',
      'IN_REVIEW',
      'NEEDS_INFO',
      'QUOTED',
      'APPROVED',
      'ASSIGNED',
      'ACCEPTED',
      'IN_PROGRESS',
      'DELIVERED',
      'COMPLETED',
      'EXCEPTION',
      'CANCELLED',
      'REFUNDED',
    ]);
  });

  it('exposes the four kinds of user', () => {
    expect(Object.values(Role)).toEqual(['CUSTOMER', 'TASKER', 'OPERATIONS', 'FINANCE', 'ADMIN']);
  });

  it('exposes the three launch services', () => {
    expect(Object.values(ServiceType)).toEqual([
      'BUY_AND_DELIVER',
      'QUEUE_AND_PAPERWORK',
      'PICKUP_AND_DROPOFF',
    ]);
  });
});
