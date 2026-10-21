import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui';

export interface PlaceholderPageProps {
  /** i18n key of the page title. */
  titleKey: string;
}

/**
 * Shared body for every Phase 0 placeholder screen: a title and an empty
 * state. No page in Phase 0 pretends to have working data.
 */
export function PlaceholderPage({ titleKey }: PlaceholderPageProps) {
  const { t } = useTranslation();

  return (
    <EmptyState
      icon={<Inbox className="h-6 w-6" />}
      title={t(titleKey)}
      description={t('common.states.placeholder')}
    />
  );
}
