import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export type RoleName = 'ADMIN' | 'CUSTOMER' | 'FINANCE' | 'OPERATIONS' | 'TASKER';

export interface RoleChipProps {
  className?: string;
  role: string;
}

const variants: Record<string, string> = {
  ADMIN: 'bg-ink-900 text-white',
  OPERATIONS: 'bg-brand-500 text-white',
  FINANCE: 'bg-brand-50 text-brand-700',
  CUSTOMER: 'bg-chip-bg text-chip-text',
  TASKER: 'bg-chip-bg text-chip-text',
};

/** The role of a person. */
export function RoleChip({ className, role }: RoleChipProps) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-3 py-1 text-chip',
        variants[role] ?? 'bg-chip-bg text-chip-text',
        className,
      )}
    >
      {t(`role.${role}`)}
    </span>
  );
}
