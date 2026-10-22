import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button, Card, CardBody } from '@/components/ui';
import { apiRequest } from '@/lib/api';

type State = 'loading' | 'done' | 'failed';

/** Handles the link of the verification email. */
export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<State>('loading');
  const token = searchParams.get('token') ?? '';

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!token) {
        setState('failed');
        return;
      }

      try {
        await apiRequest<{ ok: boolean }>('/auth/verify-email', {
          method: 'POST',
          body: { token },
          handleUnauthorized: false,
        });

        if (!cancelled) setState('done');
      } catch {
        if (!cancelled) setState('failed');
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-6">
      <Card>
        <CardBody>
          {state === 'loading' ? (
            <p className="text-[15px] text-ink-700">{t('auth.verifying')}</p>
          ) : null}

          {state === 'done' ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
              </span>
              <h1 className="font-heading text-pageTitle font-bold text-ink-900">
                {t('auth.emailVerifiedTitle')}
              </h1>
              <p className="text-[15px] text-ink-500">{t('auth.emailVerifiedDescription')}</p>
              <Link to="/app">
                <Button>{t('auth.goToApp')}</Button>
              </Link>
            </div>
          ) : null}

          {state === 'failed' ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg text-danger-text">
                <XCircle aria-hidden="true" className="h-6 w-6" />
              </span>
              <h1 className="font-heading text-pageTitle font-bold text-ink-900">
                {t('auth.verifyFailedTitle')}
              </h1>
              <p className="text-[15px] text-ink-500">{t('auth.verifyFailedDescription')}</p>
              <Link to="/app/profile">
                <Button variant="secondary">{t('auth.resendVerification')}</Button>
              </Link>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
