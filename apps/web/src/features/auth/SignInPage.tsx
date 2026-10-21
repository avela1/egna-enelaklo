import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button, FormField, Input, useToast } from '@/components/ui';

const signInSchema = z.object({
  identifier: z.string().min(1, 'required'),
  password: z.string().min(1, 'required'),
});

type SignInValues = z.infer<typeof signInSchema>;

export function SignInPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = handleSubmit(() => {
    toast({
      title: t('common.states.placeholder'),
      description: t('auth.signInTitle'),
      variant: 'info',
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-pageTitle font-bold text-ink-900">
          {t('auth.signInTitle')}
        </h1>
        <p className="text-[15px] text-ink-500">{t('auth.signInSubtitle')}</p>
      </header>

      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <FormField
          htmlFor="sign-in-identifier"
          label={t('auth.emailOrPhone')}
          error={errors.identifier ? t('auth.errors.required') : undefined}
        >
          <Input
            id="sign-in-identifier"
            type="text"
            autoComplete="username"
            placeholder="tigist@example.com"
            {...register('identifier')}
          />
        </FormField>

        <FormField
          htmlFor="sign-in-password"
          label={t('auth.password')}
          error={errors.password ? t('auth.errors.required') : undefined}
        >
          <Input
            id="sign-in-password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
        </FormField>

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>

        <Button type="submit" size="lg">
          {t('common.actions.signIn')}
        </Button>
      </form>

      <div className="flex items-center gap-4 text-sm text-ink-500">
        <span className="h-px flex-1 bg-line" />
        <span>{t('auth.newHere')}</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <Link
        to="/register"
        className="flex min-h-primary items-center justify-center rounded-control border border-brand-500 bg-surface px-4 text-[15px] font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        {t('auth.createAccount')}
      </Link>

      <p className="text-sm text-ink-500">{t('auth.inviteNote')}</p>
    </div>
  );
}
