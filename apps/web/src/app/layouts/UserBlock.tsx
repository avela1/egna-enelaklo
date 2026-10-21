import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export interface UserBlockProps {
  className?: string;
  /** Role shown under the name, e.g. "Operations". */
  roleLabel?: string;
  tone?: 'light' | 'dark';
  variant?: 'row' | 'stacked';
}

/**
 * Placeholder user block. Phase 0 has no authentication, so it deliberately
 * shows a generic, clearly unsigned state instead of a fake person.
 */
export function UserBlock({
  className,
  roleLabel,
  tone = 'light',
  variant = 'row',
}: UserBlockProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex items-center gap-3',
        variant === 'stacked' ? 'flex-col items-center text-center' : null,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
          tone === 'dark' ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-700',
        )}
      >
        ?
      </span>

      <div className="flex min-w-0 flex-col">
        <span
          className={cn(
            'truncate text-sm font-semibold',
            tone === 'dark' ? 'text-white' : 'text-ink-900',
          )}
        >
          {t('common.user.guest')}
        </span>
        <span className={cn('truncate text-xs', tone === 'dark' ? 'text-ink-500' : 'text-ink-500')}>
          {roleLabel ? `${roleLabel} · ` : ''}
          {t('common.user.notSignedIn')}
        </span>
      </div>
    </div>
  );
}
