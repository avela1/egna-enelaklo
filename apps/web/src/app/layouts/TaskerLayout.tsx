import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brand } from '@/components/brand';
import { cn } from '@/lib/cn';
import { usePageTitleKey } from '../hooks/usePageTitleKey';
import { LanguageSwitch } from './LanguageSwitch';
import { UserBlock } from './UserBlock';

const taskerNav = [
  { end: true, labelKey: 'nav.tasker.assignments', to: '/tasker' },
  { end: false, labelKey: 'nav.tasker.activeJob', to: '/tasker/job' },
  { end: false, labelKey: 'nav.tasker.earnings', to: '/tasker/earnings' },
  { end: false, labelKey: 'nav.tasker.profile', to: '/tasker/profile' },
] as const;

/** Tasker portal: top navigation, centred content column, page background canvas. */
export function TaskerLayout() {
  const { t } = useTranslation();
  const titleKey = usePageTitleKey();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-tasker flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
          <Link
            to="/tasker"
            className="inline-flex rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Brand markSize={40} />
          </Link>

          <span className="rounded-pill bg-ink-900 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            {t('nav.tasker.badge')}
          </span>

          <nav
            aria-label={t('nav.tasker.badge')}
            className="order-last w-full sm:order-none sm:w-auto"
          >
            <ul className="flex flex-wrap items-center gap-1">
              {taskerNav.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'inline-flex min-h-control items-center rounded-panel px-4 text-[15px] transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                        isActive
                          ? 'bg-brand-50 font-bold text-brand-700'
                          : 'font-medium text-ink-700 hover:bg-canvas',
                      )
                    }
                  >
                    {t(item.labelKey)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitch />
            <UserBlock className="hidden sm:flex" tone="light" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-tasker px-4 py-6">
        {titleKey ? (
          <h1 className="mb-4 font-heading text-pageTitle font-bold text-ink-900">{t(titleKey)}</h1>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
}
