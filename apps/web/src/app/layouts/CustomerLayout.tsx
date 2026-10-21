import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, CircleHelp, ClipboardList, MapPin, Menu, Plus, Wallet, X } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { usePageTitleKey } from '../hooks/usePageTitleKey';
import { LanguageSwitch } from './LanguageSwitch';
import { UserBlock } from './UserBlock';

const customerNav = [
  { end: true, icon: ClipboardList, labelKey: 'nav.customer.myTasks', to: '/app' },
  { end: false, icon: Plus, labelKey: 'nav.customer.newTask', to: '/app/new-task' },
  { end: false, icon: MapPin, labelKey: 'nav.customer.addresses', to: '/app/addresses' },
  { end: false, icon: Wallet, labelKey: 'nav.customer.payments', to: '/app/payments' },
  { end: false, icon: CircleHelp, labelKey: 'nav.customer.help', to: '/app/help' },
] as const;

function CustomerNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t('app.portal')} className="flex flex-col gap-1">
      {customerNav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex min-h-control items-center gap-3 rounded-panel px-3 text-[15px] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              isActive
                ? 'bg-brand-50 font-bold text-brand-700'
                : 'font-medium text-ink-700 hover:bg-canvas',
            )
          }
        >
          <item.icon aria-hidden="true" className="h-5 w-5 shrink-0" />
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}

function CustomerSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <Link
          to="/app"
          className="inline-flex rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Brand markSize={40} />
        </Link>
      </div>

      <div className="flex-1 px-3">
        <CustomerNav onNavigate={onNavigate} />
      </div>

      <div className="border-t border-line p-3">
        <UserBlock roleLabel={t('common.roles.customer')} />
      </div>
    </div>
  );
}

/** Customer portal: light sidebar on the left, page title and language switch on top. */
export function CustomerLayout() {
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
            className="absolute inset-0 bg-ink-900/40"
          />
          <div className="absolute inset-y-0 left-0 w-[232px] border-r border-line bg-surface">
            <div className="flex justify-end p-2">
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('common.actions.close')}
                onClick={() => setMobileNavOpen(false)}
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </Button>
            </div>
            <div className="h-[calc(100%-3.5rem)]">
              <CustomerSidebar onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen">
        <aside className="hidden w-[232px] shrink-0 border-r border-line bg-surface lg:block">
          <CustomerSidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-line bg-surface">
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

                <div className="min-w-0">
                  <p className="truncate text-sm text-ink-500">{t('app.portal')}</p>
                  <h1 className="truncate font-heading text-pageTitle font-bold text-ink-900">
                    {titleKey ? t(titleKey) : t('app.name')}
                  </h1>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <LanguageSwitch />
                <Link
                  to="/app/notifications"
                  aria-label={t('nav.customer.notifications')}
                  className="hidden h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-700 transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:flex"
                >
                  <Bell aria-hidden="true" className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
