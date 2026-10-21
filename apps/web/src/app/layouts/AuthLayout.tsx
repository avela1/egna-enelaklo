import { Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Briefcase, FileText, Package } from 'lucide-react';
import { Brand } from '@/components/brand';
import { LanguageSwitch } from './LanguageSwitch';

const serviceIcons = {
  BUY_AND_DELIVER: Package,
  QUEUE_AND_PAPERWORK: FileText,
  PICKUP_AND_DROPOFF: Briefcase,
} as const;

const serviceDescriptions = {
  BUY_AND_DELIVER: 'Items bought within your budget, with receipt.',
  QUEUE_AND_PAPERWORK: 'Kebele, licensing offices and banks.',
  PICKUP_AND_DROPOFF: 'Parcels, documents and keys, with proof.',
} as const;

/**
 * Public layout for sign in, register and forgot password.
 * There is no marketing landing page: the root URL goes straight to sign in.
 */
export function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-2">
      <div className="flex min-h-screen flex-col px-5 py-5 sm:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link
            to="/sign-in"
            className="inline-flex rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Brand markSize={40} />
          </Link>
          <LanguageSwitch />
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-5 text-sm text-ink-500">
          <span className="underline underline-offset-4">{t('auth.terms')}</span>
          <span className="underline underline-offset-4">{t('auth.privacy')}</span>
          <span className="underline underline-offset-4">{t('auth.prohibitedItems')}</span>
          <span className="underline underline-offset-4">{t('auth.help')}</span>
        </footer>
      </div>

      <aside className="hidden bg-ink-900 px-10 py-12 lg:flex lg:flex-col lg:justify-center">
        <h2 className="max-w-md font-heading text-5xl font-bold leading-tight text-white">
          {t('app.tagline')}
        </h2>
        <p className="mt-4 max-w-md text-lg text-ink-500">
          {t('auth.signInSubtitle')} {t('app.portal')}.
        </p>

        <ul className="mt-10 flex max-w-md flex-col gap-3">
          {Object.entries(serviceIcons).map(([key, Icon]) => (
            <li
              key={key}
              className="flex items-center gap-4 rounded-panel bg-white/5 px-4 py-3 text-white"
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-panel bg-brand-500"
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex flex-col">
                <span className="font-heading text-[15px] font-bold">{t(`services.${key}`)}</span>
                <span className="text-sm text-ink-500">
                  {serviceDescriptions[key as keyof typeof serviceDescriptions]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
