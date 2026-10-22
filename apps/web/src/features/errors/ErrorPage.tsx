import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button, Card, CardBody, EmptyState } from '@/components/ui';

/** The screen for a server error. */
export function ErrorPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
      <Card>
        <CardBody>
          <EmptyState
            icon={<AlertTriangle className="h-6 w-6" />}
            title={t('errors.serverErrorTitle')}
            description={t('errors.serverErrorDescription')}
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
