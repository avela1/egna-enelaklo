import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { RegisterSchema, type RegisterValues } from '@egna-enelaklo/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardBody, Checkbox, FormField, Input, useToast } from '@/components/ui';
import { ApiError, apiRequest } from '@/lib/api';
import { LanguagePicker } from '@/features/profile/LanguagePicker';

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [locale, setLocale] = useState('en');

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setValue,
    watch,
  } = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      locale: 'en',
      termsAccepted: false,
    },
  });

  const password = watch('password') ?? '';

  const rules = [
    { met: password.length >= 10, label: t('auth.passwordRuleLength') },
    { met: /[A-Za-z]/.test(password), label: t('auth.passwordRuleLetter') },
    { met: /[0-9]/.test(password), label: t('auth.passwordRuleNumber') },
  ];

  const onSubmit = handleSubmit(async (values) => {
    try {
      await apiRequest<{ user: unknown }>('/auth/register', {
        method: 'POST',
        body: values,
        handleUnauthorized: false,
      });

      // The registration already started a session, so there is no need to sign
      // in again. The person only has to confirm the email address.
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });

      toast({
        title: t('auth.accountCreated'),
        description: t('auth.checkYourEmail'),
        variant: 'success',
      });
      navigate('/app', { replace: true });
    } catch (error) {
      toast({
        title: t('common.states.error'),
        description:
          error instanceof ApiError && error.code === 'EMAIL_TAKEN'
            ? t('auth.emailTaken')
            : t('common.states.error'),
        variant: 'error',
      });
    }
  });

  return (
    <div className="flex w-full max-w-[520px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-pageTitle font-bold text-ink-900">
          {t('auth.registerTitle')}
        </h1>
        <p className="text-[15px] text-ink-500">{t('auth.registerSubtitle')}</p>
      </div>

      <Card>
        <CardBody>
          <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
            <FormField
              htmlFor="register-name"
              label={t('auth.fullName')}
              error={errors.name?.message ? t(errors.name.message) : undefined}
            >
              <Input id="register-name" type="text" autoComplete="name" {...register('name')} />
            </FormField>

            <FormField
              htmlFor="register-phone"
              label={t('auth.phone')}
              hint={t('auth.phoneHint')}
              error={errors.phone?.message ? t(errors.phone.message) : undefined}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-input items-center rounded-control border border-line bg-canvas px-3 text-[15px] text-ink-700">
                  +251
                </span>
                <Input
                  id="register-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="911234567"
                  {...register('phone')}
                />
              </div>
            </FormField>

            <FormField
              htmlFor="register-email"
              label={t('auth.email')}
              error={errors.email?.message ? t(errors.email.message) : undefined}
            >
              <Input id="register-email" type="email" autoComplete="email" {...register('email')} />
            </FormField>

            <FormField
              htmlFor="register-password"
              label={t('auth.password')}
              error={errors.password?.message ? t(errors.password.message) : undefined}
            >
              <Input
                id="register-password"
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

            <FormField label={t('auth.language')} htmlFor="register-language">
              <LanguagePicker
                value={locale}
                onChange={(value) => {
                  setLocale(value);
                  setValue('locale', value as 'am' | 'en' | 'om', { shouldValidate: true });
                }}
              />
            </FormField>

            <Checkbox
              label={t('auth.termsLabel')}
              checked={watch('termsAccepted')}
              onCheckedChange={(checked) =>
                setValue('termsAccepted', checked, { shouldValidate: true })
              }
            />
            {errors.termsAccepted ? (
              <p role="alert" className="text-xs font-semibold text-danger-text">
                {t('validation.termsRequired')}
              </p>
            ) : null}

            <Button type="submit" size="lg" loading={isSubmitting}>
              {t('common.actions.createAccount')}
            </Button>

            <p className="text-sm text-ink-500">
              {t('auth.haveAccount')}{' '}
              <Link
                to="/sign-in"
                className="font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {t('common.actions.signIn')}
              </Link>
            </p>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
