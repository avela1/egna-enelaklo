import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button, FormField, Input, useToast } from '@/components/ui';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'required').email('email'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(() => {
    toast({
      title: t('common.states.placeholder'),
      description: t('auth.forgotPasswordTitle'),
      variant: 'info',
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-pageTitle font-bold text-ink-900">
          {t('auth.forgotPasswordTitle')}
        </h1>
        <p className="text-[15px] text-ink-500">{t('auth.signInSubtitle')}</p>
      </header>

      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <FormField
          htmlFor="forgot-password-email"
          label={t('auth.email')}
          error={errors.email ? t(`auth.errors.${errors.email.message}`) : undefined}
        >
          <Input
            id="forgot-password-email"
            type="email"
            autoComplete="email"
            {...register('email')}
          />
        </FormField>

        <Button type="submit" size="lg">
          {t('auth.sendResetLink')}
        </Button>
      </form>

      <p className="text-sm text-ink-500">
        <Link
          to="/sign-in"
          className="font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {t('common.actions.back')}
        </Link>
      </p>
    </div>
  );
}
