import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { PasswordSchema } from '@egna-enelaklo/shared';
import { Button, Card, CardBody, FormField, Input, useToast } from '@/components/ui';
import { ApiError, apiRequest } from '@/lib/api';

type PasswordForm = { password: string };

type Mode = 'reset' | 'invite';

export interface PasswordFormPageProps {
  mode: Mode;
}

/**
 * One page for two jobs: setting a new password with a reset link, and
 * accepting a staff invitation. The difference is the endpoint and the copy.
 */
export function PasswordFormPage({ mode }: PasswordFormPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [done, setDone] = useState(false);
  const token = searchParams.get('token') ?? '';

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    watch,
  } = useForm<PasswordForm>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: { password: '' },
  });

  const password = watch('password') ?? '';

  const rules = [
    { met: password.length >= 10, label: t('auth.passwordRuleLength') },
    { met: /[A-Za-z]/.test(password), label: t('auth.passwordRuleLetter') },
    { met: /[0-9]/.test(password), label: t('auth.passwordRuleNumber') },
  ];

  const onSubmit = handleSubmit(async (values) => {
    try {
      await apiRequest<{ ok: boolean }>(mode === 'invite' ? '/auth/accept-invite' : '/auth/reset', {
        method: 'POST',
        body: { token, password: values.password },
        handleUnauthorized: false,
      });

      setDone(true);
      toast({
        title: mode === 'invite' ? t('auth.inviteAccepted') : t('auth.passwordChanged'),
        variant: 'success',
      });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'UNKNOWN_ERROR';

      toast({
        title: t('common.states.error'),
        description:
          code === 'TOKEN_EXPIRED'
            ? t('auth.linkExpired')
            : code === 'INVALID_TOKEN'
              ? t('auth.linkInvalid')
              : t('common.states.error'),
        variant: 'error',
      });
    }
  });

  if (done) {
    return (
      <div className="flex w-full max-w-[420px] flex-col gap-6">
        <Card>
          <CardBody>
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                <Check aria-hidden="true" className="h-6 w-6" />
              </span>
              <h1 className="font-heading text-pageTitle font-bold text-ink-900">
                {mode === 'invite' ? t('auth.inviteAcceptedTitle') : t('auth.passwordChangedTitle')}
              </h1>
              <p className="text-[15px] text-ink-500">
                {mode === 'invite'
                  ? t('auth.inviteAcceptedDescription')
                  : t('auth.passwordChangedDescription')}
              </p>
              <Button
                onClick={() =>
                  navigate(mode === 'invite' ? '/staff' : '/sign-in', { replace: true })
                }
              >
                {mode === 'invite' ? t('auth.goToStaffConsole') : t('common.actions.backToSignIn')}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-pageTitle font-bold text-ink-900">
          {mode === 'invite' ? t('auth.inviteTitle') : t('auth.resetTitle')}
        </h1>
        <p className="text-[15px] text-ink-500">
          {mode === 'invite' ? t('auth.inviteSubtitle') : t('auth.resetSubtitle')}
        </p>
      </div>

      <Card>
        <CardBody>
          <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
            <FormField
              htmlFor="new-password"
              label={t('auth.newPassword')}
              error={errors.password?.message ? t(errors.password.message) : undefined}
            >
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
              />
            </FormField>

            <ul className="flex flex-col gap-1.5" aria-label={t('auth.passwordRules')}>
              {rules.map((rule) => (
                <li
                  key={rule.label}
                  className={`flex items-center gap-2 text-sm ${
                    rule.met ? 'text-brand-700' : 'text-ink-500'
                  }`}
                >
                  {rule.met ? (
                    <Check aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <X aria-hidden="true" className="h-4 w-4" />
                  )}
                  {rule.label}
                </li>
              ))}
            </ul>

            <Button type="submit" size="lg" loading={isSubmitting} disabled={!token}>
              {t('auth.setPassword')}
            </Button>

            <Link
              to="/sign-in"
              className="text-center text-sm font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {t('common.actions.backToSignIn')}
            </Link>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
