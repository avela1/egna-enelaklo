import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-4">
      <EmptyState title={t('pages.notFound.title')} description={t('pages.notFound.description')} />

      <Link
        to="/sign-in"
        className="absolute bottom-8 text-sm font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {t('auth.signInTitle')}
      </Link>
    </div>
  );
}
