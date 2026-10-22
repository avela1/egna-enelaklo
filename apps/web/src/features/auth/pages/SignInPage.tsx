import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { LoginSchema, PORTAL_BY_ROLE } from '@egna-enelaklo/shared';
import { LogoMark, Wordmark } from '@/components/brand';
import { Alert, Button, Card, CardBody, FormField, Input } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '../auth-context';

type LoginValues = { email: string; password: string };

export function SignInPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionExpired, clearSessionExpired, signIn } = useAuth();

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<{ code: string; message: string } | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    try {
      const user = await signIn(values);
      const target =
        (location.state as { from?: string } | null)?.from ?? PORTAL_BY_ROLE[user.role] ?? '/app';
      navigate(target, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError({ code: error.code, message: error.message });
        return;
      }
      setServerError({ code: 'UNKNOWN_ERROR', message: t('common.states.error') });
    }
  });

  const isLocked = serverError?.code === 'ACCOUNT_LOCKED';

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <LogoMark size={48} />
        <Wordmark />
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-pageTitle font-bold text-ink-900">
              {t('auth.signInTitle')}
            </h1>
            <p className="text-[15px] text-ink-500">{t('auth.signInSubtitle')}</p>
          </div>

          {sessionExpired ? (
            <Alert
              tone="warning"
              className="mt-4"
              message={t('auth.sessionExpired')}
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    clearSessionExpired();
                  }}
                >
                  {t('common.actions.close')}
                </Button>
              }
            />
          ) : null}

          <form className="mt-6 flex flex-col gap-5" onSubmit={onSubmit} noValidate>
            <FormField
              htmlFor="sign-in-email"
              label={t('auth.email')}
              error={errors.email ? t('validation.email') : undefined}
            >
              <Input
                id="sign-in-email"
                type="email"
                autoComplete="email"
                placeholder="tigist@example.com"
                {...register('email')}
              />
            </FormField>

            <FormField
              htmlFor="sign-in-password"
              label={t('auth.password')}
              error={errors.password ? t('validation.required') : undefined}
              hint={
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                </button>
              }
            >
              <Input
                id="sign-in-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('password')}
              />
            </FormField>

            {serverError ? (
              <Alert
                tone="danger"
                message={isLocked ? t('auth.tooManyAttempts') : t('auth.invalidCredentials')}
              />
            ) : null}

            <Button type="submit" size="lg" loading={isSubmitting}>
              {isSubmitting ? t('auth.signingIn') : t('common.actions.signIn')}
            </Button>

            <div className="flex flex-col items-center gap-2 text-sm">
              <Link
                to="/forgot-password"
                className="font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {t('auth.forgotPassword')}
              </Link>
              <span className="text-ink-500">{t('auth.newHere')}</span>
              <Link
                to="/register"
                className="font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {t('auth.createAccount')}
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
