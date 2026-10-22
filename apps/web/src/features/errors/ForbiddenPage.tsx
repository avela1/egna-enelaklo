import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, EmptyState } from '@/components/ui';
import { ShieldAlert } from 'lucide-react';

export interface ForbiddenPageProps {
  message?: string;
}

/** The friendly screen for a request the person is not allowed to make. */
export function ForbiddenPage({ message }: ForbiddenPageProps) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
      <Card>
        <CardBody>
          <EmptyState
            icon={<ShieldAlert className="h-6 w-6" />}
            title={t('errors.forbiddenTitle')}
            description={message ?? t('errors.forbiddenDescription')}
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
