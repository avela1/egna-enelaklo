import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button, FormField, Input, useToast } from '@/components/ui';

const registerSchema = z.object({
  email: z.string().min(1, 'required').email('email'),
  fullName: z.string().min(1, 'required'),
  phone: z.string().min(1, 'required'),
});

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', fullName: '', phone: '' },
  });

  const onSubmit = handleSubmit(() => {
    toast({
      title: t('common.states.placeholder'),
      description: t('auth.registerTitle'),
      variant: 'info',
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-pageTitle font-bold text-ink-900">
          {t('auth.registerTitle')}
        </h1>
        <p className="text-[15px] text-ink-500">{t('auth.signInSubtitle')}</p>
      </header>

      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <FormField
          htmlFor="register-full-name"
          label={t('auth.fullName')}
          error={errors.fullName ? t('auth.errors.required') : undefined}
        >
          <Input
            id="register-full-name"
            type="text"
            autoComplete="name"
            {...register('fullName')}
          />
        </FormField>

        <FormField
          htmlFor="register-phone"
          label={t('auth.phone')}
          error={errors.phone ? t('auth.errors.required') : undefined}
        >
          <Input id="register-phone" type="tel" autoComplete="tel" {...register('phone')} />
        </FormField>

        <FormField
          htmlFor="register-email"
          label={t('auth.email')}
          error={errors.email ? t(`auth.errors.${errors.email.message}`) : undefined}
        >
          <Input id="register-email" type="email" autoComplete="email" {...register('email')} />
        </FormField>

        <Button type="submit" size="lg">
          {t('auth.createAccount')}
        </Button>
      </form>

      <p className="text-sm text-ink-500">
        {t('auth.newHere')}{' '}
        <Link
          to="/sign-in"
          className="font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {t('common.actions.signIn')}
        </Link>
      </p>
    </div>
  );
}
