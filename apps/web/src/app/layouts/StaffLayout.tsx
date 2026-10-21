import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import { LogoMark } from '@/components/brand';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { usePageTitleKey } from '../hooks/usePageTitleKey';
import { LanguageSwitch } from './LanguageSwitch';
import { UserBlock } from './UserBlock';

interface StaffNavItem {
  labelKey: string;
  to: string;
}

interface StaffNavGroup {
  items: StaffNavItem[];
  key: string;
  labelKey: string;
}

const staffNavGroups: StaffNavGroup[] = [
  {
    key: 'operations',
    labelKey: 'nav.staff.groups.operations',
    items: [
      { labelKey: 'nav.staff.items.queue', to: '/staff/queue' },
      { labelKey: 'nav.staff.items.review', to: '/staff/review' },
      { labelKey: 'nav.staff.items.assign', to: '/staff/assign' },
      { labelKey: 'nav.staff.items.exceptions', to: '/staff/exceptions' },
      { labelKey: 'nav.staff.items.taskers', to: '/staff/taskers' },
      { labelKey: 'nav.staff.items.reports', to: '/staff/reports' },
    ],
  },
  {
    key: 'finance',
    labelKey: 'nav.staff.groups.finance',
    items: [{ labelKey: 'nav.staff.items.payments', to: '/staff/payments' }],
  },
  {
    key: 'administration',
    labelKey: 'nav.staff.groups.administration',
    items: [
      { labelKey: 'nav.staff.items.catalog', to: '/staff/catalog' },
      { labelKey: 'nav.staff.items.templates', to: '/staff/templates' },
      { labelKey: 'nav.staff.items.users', to: '/staff/users' },
      { labelKey: 'nav.staff.items.roles', to: '/staff/roles' },
      { labelKey: 'nav.staff.items.audit', to: '/staff/audit' },
      { labelKey: 'nav.staff.items.settings', to: '/staff/settings' },
    ],
  },
];

function StaffSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col bg-ink-900">
      <div className="px-5 py-5">
        <Link
          to="/staff/queue"
          onClick={onNavigate}
          className="inline-flex items-center gap-3 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100"
        >
          <LogoMark size={40} />
          <span className="flex flex-col leading-none">
            <span className="font-heading text-[18px] font-bold text-white">egna-enelaklo</span>
            <span className="mt-1 text-xs font-semibold text-brand-100">
              {t('nav.staff.console')}
            </span>
          </span>
        </Link>
      </div>

      <nav aria-label={t('nav.staff.console')} className="flex-1 overflow-y-auto px-3 pb-4">
        {staffNavGroups.map((group) => (
          <div key={group.key} className="mb-5">
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
              {t(group.labelKey)}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-control items-center rounded-[10px] px-3 text-[15px] transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100',
                        isActive
                          ? 'bg-brand-500 font-bold text-white'
                          : 'font-medium text-white/80 hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    {t(item.labelKey)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <UserBlock tone="dark" roleLabel={t('common.roles.operations')} />
      </div>
    </div>
  );
}

/** Staff console: dark sidebar, grouped navigation, light content area. */
export function StaffLayout() {
  const { t } = useTranslation();
  const titleKey = usePageTitleKey();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-canvas">
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label={t('common.actions.close')}
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-ink-900/60"
          />
          <div className="absolute inset-y-0 left-0 w-[250px]">
            <div className="flex justify-end p-2">
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('common.actions.close')}
                onClick={() => setMobileNavOpen(false)}
                className="text-white hover:bg-white/10"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </Button>
            </div>
            <div className="h-[calc(100%-3.5rem)]">
              <StaffSidebar onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] lg:block">
        <StaffSidebar />
      </aside>

      <div className="lg:pl-[250px]">
        <header className="sticky top-0 z-20 border-b border-line bg-surface">
          <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                aria-label={t('common.actions.open')}
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu aria-hidden="true" className="h-5 w-5" />
              </Button>

              <h1 className="truncate font-heading text-pageTitle font-bold text-ink-900">
                {titleKey ? t(titleKey) : t('nav.staff.console')}
              </h1>
            </div>

            <LanguageSwitch />
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
