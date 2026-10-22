import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button, Card, CardBody, EmptyState } from '@/components/ui';

/** The screen for a URL that does not exist. */
export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
      <Card>
        <CardBody>
          <EmptyState
            icon={<FileQuestion className="h-6 w-6" />}
            title={t('pages.notFound.title')}
            description={t('pages.notFound.description')}
            action={
              <Link to="/">
                <Button variant="secondary">{t('errors.backToStart')}</Button>
              </Link>
            }
          />
        </CardBody>
      </Card>
    </div>
  );
}
