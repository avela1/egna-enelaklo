import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useAuth } from '@/features/auth/auth-context';

export interface UserMenuProps {
  className?: string;
  /** Where the profile link points to. */
  profileTo: string;
  tone?: 'dark' | 'light';
}

/** The signed in person in the side bar or the top bar, with a sign out button. */
export function UserMenu({ className, profileTo, tone = 'light' }: UserMenuProps) {
  const { t } = useTranslation();
  const { signOut, user } = useAuth();

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Link
        to={profileTo}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-panel px-1 py-1 transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
            tone === 'dark' ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-700',
          )}
        >
          {initials || '?'}
        </span>

        <span className="flex min-w-0 flex-col">
          <span
            className={cn(
              'truncate text-sm font-semibold',
              tone === 'dark' ? 'text-white' : 'text-ink-900',
            )}
          >
            {user.name}
          </span>
          <span
            className={cn('truncate text-xs', tone === 'dark' ? 'text-ink-500' : 'text-ink-500')}
          >
            {t(`role.${user.role}`)}
          </span>
        </span>
      </Link>

      <Button
        variant="ghost"
        size="sm"
        aria-label={t('common.actions.signOut')}
        onClick={() => {
          void signOut();
        }}
        className={tone === 'dark' ? 'text-white/70 hover:bg-white/10' : undefined}
      >
        <LogOut aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  );
}
