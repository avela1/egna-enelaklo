import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Alert, Button } from '@/components/ui';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/features/auth/auth-context';

/**
 * A reminder to confirm the email address. It can be dismissed for the
 * session, and it offers to send the email again.
 */
export function VerifyEmailBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || user.emailVerified || dismissed) return null;

  const resend = async () => {
    await apiRequest<{ ok: boolean }>('/auth/resend-verification', {
      method: 'POST',
      body: { email: user.email },
      handleUnauthorized: false,
    });

    setSent(true);
  };

  return (
    <Alert
      tone="warning"
      className="mb-5"
      message={
        sent ? (
          t('auth.verificationSent')
        ) : (
          <span>
            {t('auth.verifyEmailBanner')}{' '}
            <button
              type="button"
              onClick={() => void resend()}
              className="font-bold text-brand-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {t('auth.resendVerification')}
            </button>
          </span>
        )
      }
      action={
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('common.actions.close')}
          onClick={() => setDismissed(true)}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </Button>
      }
    />
  );
}
