import { TaskStatus } from '@egna-enelaklo/shared';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export type StatusChipVariant =
  | 'neutral'
  | 'teal-tint'
  | 'amber'
  | 'solid-teal'
  | 'outlined-teal'
  | 'charcoal'
  | 'danger'
  | 'outlined-charcoal';

/**
 * Single source of truth for the task status colours.
 * Draft/Cancelled are grey, Submitted/In review are a teal tint, Needs info
 * and Quote ready are amber, Approved/In progress are solid teal, Delivered is
 * an outlined teal, Completed is charcoal, Exception is red.
 */
export const TASK_STATUS_CHIP_VARIANT: Record<TaskStatus, StatusChipVariant> = {
  [TaskStatus.DRAFT]: 'neutral',
  [TaskStatus.SUBMITTED]: 'teal-tint',
  [TaskStatus.IN_REVIEW]: 'teal-tint',
  [TaskStatus.NEEDS_INFO]: 'amber',
  [TaskStatus.QUOTED]: 'amber',
  [TaskStatus.APPROVED]: 'solid-teal',
  [TaskStatus.ASSIGNED]: 'teal-tint',
  [TaskStatus.ACCEPTED]: 'teal-tint',
  [TaskStatus.IN_PROGRESS]: 'solid-teal',
  [TaskStatus.DELIVERED]: 'outlined-teal',
  [TaskStatus.COMPLETED]: 'charcoal',
  [TaskStatus.EXCEPTION]: 'danger',
  [TaskStatus.CANCELLED]: 'neutral',
  [TaskStatus.REFUNDED]: 'outlined-charcoal',
};

const variants: Record<StatusChipVariant, string> = {
  neutral: 'bg-chip-bg text-chip-text',
  'teal-tint': 'bg-brand-50 text-brand-700',
  amber: 'bg-warning-bg text-warning-text',
  'solid-teal': 'bg-brand-500 text-white',
  'outlined-teal': 'border border-brand-500 bg-surface text-brand-700',
  charcoal: 'bg-ink-900 text-white',
  danger: 'bg-danger-bg text-danger-text',
  'outlined-charcoal': 'border border-ink-900 bg-surface text-ink-900',
};

export interface StatusChipProps {
  className?: string;
  status: TaskStatus;
}

export function StatusChip({ className, status }: StatusChipProps) {
  const { t } = useTranslation();
  const variant = TASK_STATUS_CHIP_VARIANT[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-3 py-1 text-chip',
        variants[variant],
        className,
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}
