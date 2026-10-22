import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export type UserStatus = 'ACTIVE' | 'DISABLED' | 'INVITED';

export interface UserStatusChipProps {
  className?: string;
  status: string;
}

const variants: Record<string, string> = {
  ACTIVE: 'bg-brand-50 text-brand-700',
  DISABLED: 'bg-danger-bg text-danger-text',
  INVITED: 'bg-warning-bg text-warning-text',
};

/** The status of an account: active, disabled or invited. */
export function UserStatusChip({ className, status }: UserStatusChipProps) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-3 py-1 text-chip',
        variants[status] ?? 'bg-chip-bg text-chip-text',
        className,
      )}
    >
      {t(`userStatus.${status}`)}
    </span>
  );
}
