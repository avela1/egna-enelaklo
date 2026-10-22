import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Mail } from 'lucide-react';
import { ForgotPasswordSchema } from '@egna-enelaklo/shared';
import { Button, Card, CardBody, FormField, Input } from '@/components/ui';
import { apiRequest } from '@/lib/api';
import { cn } from '@/lib/cn';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<{ email: string }>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await apiRequest<{ ok: boolean }>('/auth/forgot', {
        method: 'POST',
        body: values,
        handleUnauthorized: false,
      });
    } catch {
      // The answer is the same whether or not the email exists.
    }

    setSent(true);
  });

  const steps = [
    { key: 'one', label: t('auth.forgotStepOne'), active: !sent, done: sent },
    { key: 'two', label: t('auth.forgotStepTwo'), active: sent, done: false },
    { key: 'three', label: t('auth.forgotStepThree'), active: false, done: false },
  ];

  return (
    <div className="flex w-full max-w-[520px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-pageTitle font-bold text-ink-900">
          {t('auth.forgotPasswordTitle')}
        </h1>
        <p className="text-[15px] text-ink-500">{t('auth.forgotPasswordSubtitle')}</p>
      </div>

      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={step.key}>
            <Card className={cn(step.active && 'border-brand-500')}>
              <CardBody>
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold',
                      step.done
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : step.active
                          ? 'border-brand-500 bg-surface text-brand-700'
                          : 'border-line bg-surface text-ink-500',
                    )}
                  >
                    {step.done ? <Check className="h-4 w-4" /> : index + 1}
                  </span>

                  <div className="flex flex-1 flex-col gap-3">
                    <p className="text-[15px] font-semibold text-ink-900">{step.label}</p>

                    {step.key === 'one' && !sent ? (
                      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
                        <FormField
                          htmlFor="forgot-email"
                          label={t('auth.email')}
                          error={errors.email ? t('validation.email') : undefined}
                        >
                          <Input
                            id="forgot-email"
                            type="email"
                            autoComplete="email"
                            {...register('email')}
                          />
                        </FormField>

                        <Button type="submit" size="lg" loading={isSubmitting}>
                          {t('auth.sendResetLink')}
                        </Button>
                      </form>
                    ) : null}

                    {step.key === 'one' && sent ? (
                      <p className="text-sm text-ink-700">{t('auth.forgotSent')}</p>
                    ) : null}

                    {step.key === 'two' ? (
                      <p className="flex items-start gap-2 text-sm text-ink-700">
                        <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
                        {t('auth.forgotCheckInbox')}
                      </p>
                    ) : null}

                    {step.key === 'three' ? (
                      <p className="text-sm text-ink-700">{t('auth.forgotSetNew')}</p>
                    ) : null}
                  </div>
                </div>
              </CardBody>
            </Card>
          </li>
        ))}
      </ol>

      {sent ? (
        <div className="flex flex-col gap-3">
          <Button variant="secondary" onClick={() => setSent(false)}>
            {t('auth.sendToAnotherEmail')}
          </Button>
          <Link
            to="/sign-in"
            className="text-center text-sm font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {t('common.actions.backToSignIn')}
          </Link>
        </div>
      ) : null}

      {!sent ? (
        <Link
          to="/sign-in"
          className="text-center text-sm font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {t('common.actions.backToSignIn')}
        </Link>
      ) : null}
    </div>
  );
}
